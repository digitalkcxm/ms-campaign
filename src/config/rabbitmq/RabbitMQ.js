import dotenv from 'dotenv'
import amqp from 'amqplib'

dotenv.config({ path: `../../` })

const newConnection = async () => {
  const user = process.env.RABBITMQ_USER
  const password = process.env.RABBITMQ_PASSWORD
  const host = process.env.RABBITMQ_HOST
  const port = process.env.RABBITMQ_PORT

  try {
    return await amqp.connect(`amqp://${user}:${password}@${host}:${port}?heartbeat=20`)
  } catch (err) {
    console.error(
      '[RabbitMQ | newConnection] Error connecting to RabbitMQ',
      err
    )
  }
}

const producerConnSingleton = (() => {
  let instance
  const createConnInstance = async () => {
    const conn = await newConnection()
    return conn
  }

  return {
    getInstance: async () => {
      if (!instance) {
        instance = await createConnInstance()
      }
      return instance
    },
  }
})()

const consumerConnSingleton = (() => {
  let instance
  const createConnInstance = async () => {
    const conn = await newConnection()
    return conn
  }

  return {
    getInstance: async () => {
      if (!instance) {
        instance = await createConnInstance()
      }
      return instance
    },
  }
})()

export {
    producerConnSingleton as producerConn,
    consumerConnSingleton as consumerConn,
}
