const logger = require('../index');

const lg = logger.createNamedLogger({ ext : true, 
    showCaller : true, 
    showLineNumber : true, 
    dateTimeFormat : 'iso'  });

lg.info('This is a test info string.');
lg.info(`This is a test info string.`);

const opt = undefined;
const { ext = true, showCaller = false, showLineNumber = false, dateTimeFormat = 'iso' } = opt || {};
lg.warn(`ext: ${ext}`);
lg.warn(`showCaller: ${showCaller}`);
lg.warn(`showLineNumber: ${showLineNumber}`);
lg.warn(`dateTimeFormat: ${dateTimeFormat}`);

function func1 () {
    lg.debug(`This is a test debug string inside a sync function.`);
    lg.notice(`This is a test debug string inside a sync function.`);
}

async function func2 () {
    lg.debug(`This is a test debug string inside an async function.`);
}

func1();
func2();


async function run () {
    await func2();
}

if (require.main === module) {
    logger.log('called directly');
    logger.log(process.argv);

    run();
}

// $ LOGGER=info node test2.js
logger.log('****************************************');
logger.log('*** Test Environment Variable LOGGER ***');
logger.log('****************************************');
logger.log("LOGGER=info, debug level will not show");
logger.error('error show');
logger.warn('warn show');
logger.info('info show');
logger.debug('debug will not show');
logger.success('success show');
