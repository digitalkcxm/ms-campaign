import client from 'amqplib'

class RabbitMQConnection {
  connection
  channel
  connected

  async connect() {
    if (this.connected && this.channel) return
    else this.connected = true

    try {
      console.log('⌛️ Connecting to Rabbit-MQ Server')

      const user = process.env.RABBITMQ_USER
      const password = process.env.RABBITMQ_PASSWORD
      const host = process.env.RABBITMQ_HOST
      const port = process.env.RABBITMQ_PORT

      this.connection = await client.connect(
        `amqp://${user}:${password}@${host}:${port}`
      )

      console.log('✅ Rabbit MQ Connection is ready')

      this.channel = await this.connection.createChannel()

      console.log('🛸 Created RabbitMQ Channel successfully')
    } catch (error) {
      console.error(error)
      console.error('Not connected to MQ Server')
    }
  }

  async sendToExchangeQueue(exchange, routingKey, data) {
    try {
      if (!this.channel) {
        await this.connect()
      }

      this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(data))
      )
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  async sendToExchangeQueueDelayed(
    exchange,
    routingKey,
    data,
    delayInMilliseconds
  ) {
    if (!this.channel) {
      await this.connect()
    }

    await this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      {
        deliveryMode: 2,
        mandatory: true,
        headers: { 'x-delay': delayInMilliseconds },
      }
    )
  }

  async sendToQueue(queue, message) {
    try {
      if (!this.channel) {
        await this.connect()
      }

      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)))
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}

const mqConnection = new RabbitMQConnection()

export default mqConnection
