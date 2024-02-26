import RabbitMQ from './RabbitMQ.js'
import QueueController from '../controller/QueueController.js'
import { database, logger, connRabbit, redis } from './server.js'

const queueController = new QueueController(database, logger, redis)

export async function startConsumersQueues() {
  RabbitMQ.addConsumer(queueController.campaignScheduling.bind(queueController))
  RabbitMQ.addConsumer(queueController.campaignCreateTicket.bind(queueController))

  RabbitMQ.startConsumers(connRabbit)
}
