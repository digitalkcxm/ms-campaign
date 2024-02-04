import dotenv from 'dotenv'
import apm from 'elastic-apm-node'
dotenv.config()

const projectName = process.env.PROJECT_NAME
const apmServerUrl = process.env.APM_SERVER_URL
const environment = process.env.APP_ENVIRONMENT

let tracing = apm.start({
    serviceName:  projectName,
    serverUrl:  apmServerUrl,
    environment: environment,
    pageLoadTraceId: '${transaction.traceId}',
    pageLoadSpanId: '${transaction.ensureParentId()}',
    pageLoadSampled: '${transaction.sampled}',
    usePathAsTransactionName: 'true',
    transactionSampleRate: 1,
    active: process.env.NODE_ENV === 'production',
    // logLevel: 'debug',
})

export default tracing
