import RabbitMQ from './RabbitMQ.js'
import QueueController from '../controller/QueueController.js'
import { database, logger, connRabbit, redis } from './server.js'

const queueController = new QueueController(database, logger, redis)

export async function startConsumersQueues() {
  RabbitMQ.addConsumer(queueController.CampaignScheduling.bind(queueController))
  RabbitMQ.addConsumer(queueController.CampaignEvents.bind(queueController))

  RabbitMQ.startConsumers(connRabbit)
}
