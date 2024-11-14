import HandlersFactory from '../ActionHandlers/HandlersFactory.js'
import CampaignController from './CampaignController.js'
import WorkflowController from './WorkflowController.js'

export default class QueueController {
  constructor(database, logger, redis) {
    this.database = database
    this.logger = logger
    this.redis = redis

    this.campaignController = new CampaignController(database, logger)
    this.workflowController = new WorkflowController(database, logger)    
  }

  async campaignScheduling(rabbit) {
    try {
      const queue_name = 'campaign_scheduling'
      const exchange_name = 'campaign_scheduling'
      const queue_name_binded = 'campaign_scheduling'
      const queue_dead_name = 'dead_campaign_scheduling'

      rabbit.assertExchange(exchange_name, 'x-delayed-message', {
        autoDelete: false,
        durable: true,
        passive: true,
        arguments: { 'x-delayed-type': 'direct' }
      })

      rabbit.assertQueue(queue_name, { durable: true })
      rabbit.bindQueue(queue_name, exchange_name, queue_name_binded)
      
      rabbit.prefetch(10)

      rabbit.consume(queue_name, async (msg) => {

        console.log('[QueueController | campaignScheduling] ExecutingCampaign: ', msg.content.toString())
        const incomingEvent = JSON.parse(msg.content.toString())
        
        // Instancia o handler correto
        const eventType = incomingEvent?.type || 'unknown'
        const ActionHandler = HandlersFactory.create(eventType, this.database, this.redis, this.logger)
        if(!ActionHandler) {
          console.error(`[QueueController | campaignScheduling] ActionHandler not found for event type: ${eventType}`, msg.content.toString())
          rabbit.nack(msg, false, false)
          return
        }
        
        // Executa a ação
        const result = await ActionHandler.handleAction(incomingEvent)
        if (!result) {
          await rabbit.assertQueue(queue_dead_name, { durable: true, autoDelete: false })
          await rabbit.sendToQueue(queue_dead_name, Buffer.from(msg.content.toString()), {
            headers: msg.properties.headers || {},
            persistent: true
          })
        } 

        rabbit.ack(msg)

      })
    } catch (error) {
      console.error('[QueueController | campaignScheduling]', error)
    }
  }

  async campaignCreateTicket(rabbit) {
    const MAX_RETRY_ATTEMPTS = 3

    const queue_name = 'campaign_execution'
    const queue_name_binded = 'campaign_execution'
    const queue_dead_name = 'dead_campaign_execution'
    const exchange_dead_name = 'dead_campaign_execution'
    const exchange_name = 'campaign_execution'

    try {
      rabbit.assertQueue(queue_dead_name, { durable: true })
      rabbit.assertQueue(queue_name, { durable: true, deadLetterExchange: exchange_dead_name })

      rabbit.prefetch(1)

      rabbit.assertExchange(exchange_dead_name, 'fanout', { durable: 'true' })
      rabbit.assertExchange(exchange_name, 'direct', { durable: 'true' })

      rabbit.bindQueue(queue_dead_name, exchange_dead_name)
      rabbit.bindQueue(queue_name, exchange_name, queue_name_binded)

      rabbit.consume(queue_name, async msg => {
        const headers = msg.properties.headers || {}
        const retryCount = headers['x-retry-count'] || 0
        const incomingEvent = JSON.parse(msg.content.toString())

        // Instancia o handler correto
        const eventType = incomingEvent?.type || 'unknown'
        const ActionHandler = HandlersFactory.create(eventType, this.database, this.redis, this.logger)
        if(!ActionHandler) {
          console.error(`[QueueController | campaignCreateTicket] ActionHandler not found for event type: ${eventType}`, msg.content.toString())
          rabbit.nack(msg, false, false)
          return
        }
        
        // Executa a ação
        const result = await ActionHandler.handleAction(incomingEvent)
        if(result){
          rabbit.ack(msg)
          return
        }

        // Se a ação falhar, tenta reenviar a mensagem
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const newHeaders = { ...headers, 'x-retry-count': retryCount + 1 }
          rabbit.sendToQueue(queue_name, Buffer.from(msg.content.toString()), {
            headers: newHeaders,
            persistent: true
          })
          rabbit.ack(msg)
        } else {
          rabbit.nack(msg, false, false)
        }

      })
    } catch (error) {
      console.error('[QueueController | campaignCreateTicket]', error)
    }
  }
}
