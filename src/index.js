import dotenv from 'dotenv'

import { startServer } from './config/server.js'
import { startConsumersQueues } from './config/consumersQueues.js'

dotenv.config()

startServer()
startConsumersQueues()
