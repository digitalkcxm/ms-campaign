import RabbitMQ from '../config/RabbitMQ.js'
import ErrorHelper from '../helper/ErrorHelper.js'

export default class RabbitMQService {

  static async sendToExchangeQueue(exchange, routingKey, data) {
    try {
      const channel = await RabbitMQ.newConnection()
      return channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)))
    } catch (err) {
      throw new ErrorHelper('RabbitMQService', 'sendToExchangeQueue', 'An error occurred when sending to the exchange queue.', { exchange, routingKey, data }, err)
    }
  }

  static async sendToExchangeQueueDelayed(exchange, routingKey, data, delayInMilliseconds) {
    try {
      const channel = await RabbitMQ.newConnection()
      return await channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), {
        deliveryMode: 2,
        mandatory: true,
        headers: { 'x-delay': delayInMilliseconds }
      })
    } catch (err) {
      throw new ErrorHelper('RabbitMQService', 'sendToExchangeQueue', 'An error occurred when sending to the exchange queue deleayed.', { exchange, routingKey, data, delayInMilliseconds }, err)
    }
  }

  static async sendToQueue(queue_name, data) {
    try {
      const channel = await RabbitMQ.newConnection()
      channel.assertQueue(queue_name, { durable: true })
      await channel.sendToQueue(queue_name, Buffer.from(JSON.stringify(data)), { persistent: true })
    } catch (err) {
      throw new ErrorHelper('RabbitMQService', 'sendToQueue', 'An error occurred when sending to queue.', { queue_name, data }, err)
    }
  }
}
