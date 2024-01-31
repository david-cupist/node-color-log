const util = require('util');

const CONFIG = {
    SYSTEM: {
        reset: "\x1b[0m",
        bold: "\x1b[1m",
        dim: "\x1b[2m",
        italic: "\x1b[3m",
        underscore: "\x1b[4m",
        reverse: "\x1b[7m",
        strikethrough: "\x1b[9m",
        backoneline: "\x1b[1A",
        cleanthisline: "\x1b[K"
    },
    FONT: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    },
    BACKGROUND: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m"
    }
};

// Sequence of levels is important.
const LEVELS = ["success", "debug", "info", "notice", "warn", "error", "disable"];

/**
 * Returns a list of up to 10 caller function names of the caller stack.
 *
 * @return {string[]} callerList
 */
function _getCallerList () {
	const trace = new Error().stack;

	// Separate string based on the 'at' string.
	// var trace_at_sep_list = trace.split('    at ');
	const traceLineList = trace.split('    at ');

	// Remove the first 'Error\n' string.
	traceLineList.splice(0,1);

	/* Caller that has function name will look like this:
	 *     initDBCallback (/LonelyDuck/LonelyDuck/Server/main.js:219:3)
	 * But those that don't have function name will look like this:
	 *     /LonelyDuck/LonelyDuck/Server/main.js:219:3
	 * If caller does not have function name, the name will appear as "Anonymous".
	 */
	const callerNameList = traceLineList.map(line => {
		const linePartList = line.split(' ');
		if (linePartList.length === 1) return 'Anonymous';
		return linePartList[0];
	});

    // console.log(callerNameList);
	return callerNameList;
}
/**
 * Returns the list of filenames (with ext) of the caller stack.
 * From immediate caller to last caller.
 *
 * @param {boolean} ext - Whether to show the file extension.
 * 
 * @return {string[]} moduleNameList
 */
function _getCallerModuleInfoList (ext = true) {
	const trace = new Error().stack;
    // console.log(trace);

	// Get a list split by \n.
    let traceLineList = trace.split('\n');
	// Get the same list without the first 'Error' item.
	traceLineList = traceLineList.slice(1);

	/* Each item in traceLineList has format like this:
	 * 'at Object.addError (/Volumes/SSD_2TB/Dropbox/Projects/LonelyDuck/LonelyDuck/Server/Modules/Application/MiscTools.js:406:6)'
	 * Each of these will be reduced to a format like this:
	 * 'MiscTools'
	 */
	let callerModuleInfoList = traceLineList.map(line => {
		const linePartList = line.split(':');
		const untrimmedModulePathPartStr = linePartList[0];
		const untrimmedPathList = untrimmedModulePathPartStr.split('/');
		const moduleName = untrimmedPathList[untrimmedPathList.length - 1];
		return { moduleName, lineNumber: linePartList[1] };
	});
    
    if (!ext) {
        callerModuleInfoList = callerModuleInfoList.map(({moduleName, lineNumber}) => {
            return { moduleName: moduleName.split('.')[0], lineNumber };
        });
    }

    // console.log(callerModuleInfoList);
	return callerModuleInfoList;
}

/**
 * @class Logger
 * @description A logger class that can be used to log with color.
 * @param {boolean} isNamed - Whether to show the caller module name.
 * @param {boolean} ext - Whether to show the file extension.
 * @param {boolean} showCaller - Whether to show the caller function name.
 * @param {boolean} showLineNumber - Whether to show the line number.
 * @param {string} dateTimeFormat - Either 'iso' or 'utc'
 * @param {number} stackDepth - The depth of the stack to show.
 * @param {boolean} debugMode - Whether to show the debug info.
 * 
 */
class Logger {
    constructor(
        isNamed = false, 
        showModule = true,
        ext = true, 
        showCaller = false, 
        showLineNumber = false, 
        dateTimeFormat = 'iso',
        stackDepth,
        debugMode,
    ) {
        // Current command
        this.command = '';
        // Last line
        this.lastCommand = '';

        // this.name = name || ""
        this.isNamed = isNamed;
        this.showModule = showModule;
        this.ext = ext;
        this.showCaller = showCaller;
        this.showLineNumber = showLineNumber;
        this.dateTimeFormat = dateTimeFormat;
        this.stackDepth = stackDepth;
        this.debugMode = debugMode || false;

        console.log(`Logger: isNamed: ${this.isNamed}, showModule: ${this.showModule}, ext: ${this.ext}, showCaller: ${this.showCaller}, showLineNumber: ${this.showLineNumber}, dateTimeFormat: ${this.dateTimeFormat}, stackDepth: ${this.stackDepth}, debugMode: ${this.debugMode}`);

        // set level from env
        const level = process.env.LOGGER;
        if (this.isLevelValid(level)) {
            this.level = level;
        }

        this.noColor = false;

        this._getDate = () => (dateTimeFormat === 'iso') ? (new Date()).toISOString() : (dateTimeFormat === 'utc') ? (new Date()).toUTCString() : (new Date()).toString();

        this._customizedConsole = console;
    }

    createNamedLogger(opt) {
        const { 
            showModule = true, 
            ext = true, 
            showCaller = false, 
            showLineNumber = false, 
            dateTimeFormat = 'iso',
            stackDepth     = 3,
            debugMode      = false,
        } = opt || {};
        return new Logger(true, showModule, ext, showCaller, showLineNumber, dateTimeFormat, stackDepth, debugMode);
    }

    setLevel(level) {
        if (this.isLevelValid(level)) {
            this.level = level;
        } else {
            throw "Level you are trying to set is invalid";
        }

    }

    setLogStream(newStream) {
        if (newStream.writable) {
            this._customizedConsole = new console.Console(newStream);
        } else {
            throw "invalid writable stream object";
        }
    }

    setLevelNoColor() {
        this.noColor = true;
    }

    setLevelColor() {
        this.noColor = false;
    }

    isLevelValid(level) {
        return LEVELS.includes(level);
    }

    isAllowedLevel(level) {
        return this.level ? LEVELS.indexOf(this.level) <= LEVELS.indexOf(level) : true
    }

    log(...args) {
        this.append(...args);
        if (!this.noColor) {
            this.command += CONFIG.SYSTEM.reset;
        }
        this._print(this.command);
        // Save last command if we need to use for joint
        this.lastCommand = this.command;
        this.command = '';
        return this;
    }

    // deprecated
    joint() {
        console.error("node-color-log warning: `joint` is deprecated, please use `append`");

        // Clear the last line
        this._print(CONFIG.SYSTEM.backoneline + CONFIG.SYSTEM.cleanthisline);

        // Reset the command to let it joint the next
        // And print from the position of last line
        this.command = '';

        // if joint more than twice, we should clean the previous
        // backline command, since we should only do it for the
        // current time.
        this.lastCommand = this.lastCommand.replace(CONFIG.SYSTEM.backoneline, "");

        // back to the last line
        this.command += CONFIG.SYSTEM.backoneline;

        this.command += this.lastCommand;
        return this;
    }

    setDate(callback) {
        this._getDate = callback;
    }

    getPrefix() {
        if (this.isNamed) {
            let format = `${this._getDate()} [`;

            if (this.debugMode) {

                // console.log(`_getCallerModuleInfoList(this.ext): ${util.inspect(_getCallerModuleInfoList(this.ext))}`);
                // console.log(`_getCallerList(): ${util.inspect(_getCallerList())}`);
                // console.log(`this.stackDepth: ${this.stackDepth}`);

                // format += `${_getCallerModuleInfoList(this.ext)}`;
                // format += `${_getCallerList()}`;
                // format += `${this.stackDepth}`;
                // return format;
            }

            if (this.showModule) {
                format += `${_getCallerModuleInfoList(this.ext)[this.stackDepth].moduleName}`;
            }

            if (this.showCaller) {
                if (this.showModule) format += ` > ${_getCallerList()[this.stackDepth]}`;
                else                 format += `${_getCallerList()[this.stackDepth]}`;
            }
            if (this.showLineNumber) {
                format += `:${_getCallerModuleInfoList(this.ext)[this.stackDepth].lineNumber}`;
            }
            format += ']';
            return format;
        } 
        else {
            return this._getDate();
        }
    }

    color(ticket) {
        if (ticket in CONFIG.FONT) {
            this.command += CONFIG.FONT[ticket];
        } else {
            console.error("node-color-log warning: Font color not found! Use the default.")
        }
        return this;
    }

    bgColor(ticket) {
        if (ticket in CONFIG.BACKGROUND) {
            this.command += CONFIG.BACKGROUND[ticket];
        } else {
            console.error("node-color-log warning: Background color not found! Use the default.")
        }
        return this;
    }

    bold() {
        this.command += CONFIG.SYSTEM.bold;
        return this;
    }

    dim() {
        this.command += CONFIG.SYSTEM.dim;
        return this;
    }

    underscore() {
        this.command += CONFIG.SYSTEM.underscore;
        return this;
    }

    strikethrough() {
        this.command += CONFIG.SYSTEM.strikethrough;
        return this;
    }

    reverse() {
        this.command += CONFIG.SYSTEM.reverse;
        return this;
    }

    italic() {
        this.command += CONFIG.SYSTEM.italic;
        return this;
    }

    fontColorLog(ticket, text, setting) {
        let command = '';
        if (setting) {
            command += this.checkSetting(setting);
        }
        if (ticket in CONFIG.FONT) {
            command += CONFIG.FONT[ticket];
        } else {
            console.error("node-color-log warning: Font color not found! Use the default.")
        }
        command += text;

        command += CONFIG.SYSTEM.reset;
        this._print(command);
    }

    bgColorLog(ticket, text, setting) {
        let command = '';
        if (setting) {
            command += this.checkSetting(setting);
        }
        if (ticket in CONFIG.BACKGROUND) {
            command += CONFIG.BACKGROUND[ticket];
        } else {
            console.error("node-color-log warning: Background color not found! Use the default.")
        }
        command += text;

        command += CONFIG.SYSTEM.reset;
        this._print(command);
    }

    colorLog(ticketObj, text, setting) {
        let command = '';
        if (setting) {
            command += this.checkSetting(setting);
        }
        if (ticketObj.font in CONFIG.FONT) {
            command += CONFIG.FONT[ticketObj.font];
        } else {
            console.error("node-color-log warning: Font color not found! Use the default.")
        }
        if (ticketObj.bg in CONFIG.BACKGROUND) {
            command += CONFIG.BACKGROUND[ticketObj.bg]
        } else {
            console.error("node-color-log warning: Background color not found! Use the default.")
        }

        command += text;

        command += CONFIG.SYSTEM.reset;
        this._print(command);
    }

    error(...args) {
        if (!this.isAllowedLevel("error"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [ERROR] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('red').append('[ERROR]').reset()
                .append(" ")
                .color('red').log(...args);
        }
    }

    warn(...args) {
        if (!this.isAllowedLevel("warn"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [WARN] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('yellow').color('black').append('[WARN]').reset()
                .append(" ")
                .color('yellow').log(...args);
        }
    }

    notice(...args) {
        if (!this.isAllowedLevel("notice"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [NOTICE] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('magenta').color('white').append('[NOTICE]').reset()
                .append(" ")
                .color('magenta').log(...args);
        }
    }

    info(...args) {
        if (!this.isAllowedLevel("info"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [INFO] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('green').color('black').append('[INFO]').reset()
                .append(" ")
                .color('green').log(...args);
        }
    }

    debug(...args) {
        if (!this.isAllowedLevel("debug"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [DEBUG] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('cyan').color('black').append("[DEBUG]").reset()
                .append(' ')
                .color('cyan')
                .log(...args);
        }
    }

    success(...args) {
        if (!this.isAllowedLevel("success"))
            return;

        if (this.noColor) {
            const d = this.getPrefix();
            this.log(d, " [SUCCESS] ", ...args);
        } else {
            const d = this.getPrefix();
            this.append(d + " ")
                .bgColor('green').color('black').append("[SUCCESS]").reset()
                .append(' ')
                .color('green')
                .log(...args);
        }
    }

    checkSetting(setting) {
        const validSetting = ['bold', 'italic', 'dim', 'underscore', 'reverse', 'strikethrough'];
        let command = '';
        for (const item in setting) {
            if (validSetting.indexOf(item) !== -1) {
                if (setting[item] === true) {
                    command += CONFIG.SYSTEM[item];
                } else if (setting[item] !== false) {
                    console.error(`node-color-log warning: The value ${item} should be boolean.`)
                }
            } else {
                console.error(`node-color-log warning: ${item} is not valid in setting.`)
            }
        }
        return command;
    }

    // helper function to output the the log to stream
    _print(...args) {
        this._customizedConsole.log(...args);
    }

    // helper function to append the command buffer
    append(...args) {
        for (const idx in args) {
            const arg = args[idx];
            if (typeof arg === "string") {
                this.command += arg;
            } else {
                try {
                    this.command += JSON.stringify(arg);
                } catch {
                    this.command += arg;
                }
            }
            if (args.length > 1 && idx < args.length - 1) {
                this.command += " ";
            }
        }
        return this;
    }

    reset() {
        this.command += CONFIG.SYSTEM.reset;
        return this;
    }
}

const logger = new Logger();
module.exports = logger;
