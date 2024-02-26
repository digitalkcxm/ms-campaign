import helmet from 'helmet'
import express from 'express'
import moment from 'moment-timezone'
import bodyParser from 'body-parser'
import compression from 'compression'

import cors from './cors.js'
import Redis from './redis.js'
import routes from './routes.js'
import logger from './logger.js'
import tracing from './elastic-apm.js'
import rabbitmq from '../config/RabbitMQ.js'
import AppVariables from './appVariables.js'
import database from './database/database.js'
import httpLogger from '../middlewares/http-logger.js'

AppVariables.loadConfig()

const app = express()
const redis = AppVariables.stateEnv() !== 'testing' ? Redis.newConnection() : ''
const connRabbit = AppVariables.stateEnv() !== 'testing' ? await rabbitmq.newConnection() : ''

moment.tz.setDefault('America/Sao_Paulo')

app.use(bodyParser.json({ limit: '5mb' }))
cors(app)
app.use(helmet())
app.use(compression())

routes(app, database, logger, redis, tracing)

function startServer() {
  app.use(httpLogger)
  app.listen(process.env.PORT, () => logger.info(`Server running in port ${process.env.PORT}`))
}

export { startServer, app, database, logger, connRabbit, redis, tracing }
