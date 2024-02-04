import dotenv from 'dotenv'

import logger from './logger.js'
import amqp from 'amqplib/callback_api.js'

dotenv.config()

global._consumers = []
global._connRabbitMQ = false

export default class RabbitMQ {
  static async newConnection() {
    if (global._connRabbitMQ) return global._connRabbitMQ

    const user = process.env.RABBITMQ_USER
    const password = process.env.RABBITMQ_PASSWORD
    const host = process.env.RABBITMQ_HOST
    const port = process.env.RABBITMQ_PORT

    const connRabbit = await new Promise((resolve, reject) => {
      amqp.connect(`amqp://${user}:${password}@${host}:${port}?heartbeat=20`, (err, conn) => {
        if (err) {
          logger.error(`Global connection with rabbitmq failed with error: ${err.message}`)
          return setTimeout(() => {
            RabbitMQ.newConnection()
          }, 1000)
        }

        conn.on('error', (err) => {
          if (err.message !== 'Connection closing') {
            logger.error(`Global connection with rabbitmq failed with error: ${err.message}`)
            reject(err)
          }
        })

        conn.on('close', () => {
          logger.error(`Global Connection with rabbitmq was close, restart api to try reconnect`)
          return setTimeout(() => {
            global._connRabbitMQ = false
            this.newConnection()
          }, 1000)
        })

        conn.createChannel((err, ch) => {
          if (err) {
            logger.error(`There was an error creating a new channel: ${err}`)
            return setTimeout(() => {
              global._connRabbitMQ = false
              RabbitMQ.newConnection()
            }, 1000)
          }

          logger.info(`${process.env.PROJECT_NAME} connection with RabbitMQ successful.`)
          resolve(ch)
        })
      })
    })

    global._connRabbitMQ = connRabbit

    RabbitMQ.startConsumers(connRabbit)

    return global._connRabbitMQ
  }

  static addConsumer(consumer = {}) {
    global._consumers.push(consumer)
  }

  static startConsumers(connRabbit = {}) {
    const consumers = global._consumers
    for (let i = 0; i < consumers.length; i++) {
      const consumer = consumers[i]
      consumer(connRabbit)
    }
  }
}
