import RabbitMQ from './RabbitMQ.js'
import { database, logger, connRabbit, redis } from './server.js'
//import QueueController from '../controller/QueueController.js'

// const queueController = new QueueController(database, logger, redis)

export async function startConsumersQueues() {


  RabbitMQ.startConsumers(connRabbit)
}
