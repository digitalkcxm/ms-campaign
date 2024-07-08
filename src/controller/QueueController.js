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
      const exchange_name = 'scheduling_campaign'
      const routingKey = 'scheduling_campaign'
      const queueName = 'scheduling_campaign'

      rabbit.assertExchange(exchange_name, 'x-delayed-message', {
        autoDelete: false,
        durable: true,
        passive: true,
        arguments: { 'x-delayed-type': 'direct' }
      })

      rabbit.assertQueue(queueName, { durable: true })
      rabbit.bindQueue(queueName, exchange_name, routingKey)

      rabbit.prefetch(10)

      rabbit.consume(queueName, async (msg) => {
        const result = JSON.parse(msg.content.toString())
        const { company_id, campaign_id, campaign_version_id } = result

        this.logger.info({ function: 'schedulingEvents', company_id, campaign_id, campaign_version_id })

        const process = await this.campaignController.executeCampaign(company_id, campaign_id, campaign_version_id)

        // TODO: Colocar uma fila morta aqui
        if (!process) {
          rabbit.reject(msg)
        } else {
          rabbit.ack(msg)
        }
      })
    } catch (error) {
      console.log(error)
    }
  }

  async campaignCreateTicket(rabbit) {
    let process
    const MAX_RETRY_ATTEMPTS = 3

    const queue_name = 'campaign_create_ticket'
    const queue_name_binded = 'campaign_create_ticket'
    const queue_dead_name = 'dead_campaign_create_ticket'
    const exchange_dead_name = 'dead_campaign_create_ticket'
    const exchange_name = 'campaign_create_ticket'

    try {
      rabbit.assertQueue(queue_dead_name, { durable: true })
      rabbit.assertQueue(queue_name, { durable: true, deadLetterExchange: exchange_dead_name })

      rabbit.prefetch(10)

      rabbit.assertExchange(exchange_dead_name, 'fanout', { durable: 'true' })
      rabbit.assertExchange(exchange_name, 'direct', { durable: 'true' })

      rabbit.bindQueue(queue_dead_name, exchange_dead_name)
      rabbit.bindQueue(queue_name, exchange_name, queue_name_binded)

      rabbit.consume(queue_name, async msg => {
        const headers = msg.properties.headers || {}
        const retryCount = headers['x-retry-count'] || 0
        
        const message = msg.content.toString()
        const result = JSON.parse(message)
        
        console.log('🚀 ~ QueueController ~ campaignCreateTicket ~ msg:', result)

        if(result.type == 'update_status_campaign') {
          process = await this.campaignController.updateStatusCampaign(result.company, result.id_campaign, result.id_campaign_version, result.status)
        }else {
          const { company, tenantID, id_phase, end_date, name, id_campaign, id_campaign_version, id_workflow, crm, ignore_open_tickets, negotiation, message, created_by} = result

          process = await this.workflowController.createTicket(company, tenantID, id_phase, end_date, name, id_campaign, id_campaign_version, id_workflow, crm, ignore_open_tickets, negotiation, message, created_by)
        }

        if (!process) {
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            const newHeaders = { ...headers, 'x-retry-count': retryCount + 1 }
            rabbit.nack(msg, false, false)
            rabbit.sendToQueue(queue_name, Buffer.from(message), {
              headers: newHeaders,
              persistent: true
            })
          }else{
            rabbit.nack(msg, false, false)
          }

        } else {
          rabbit.ack(msg)
        }
      })
    } catch (error) {
      console.log('🚀 ~ QueueController ~ campaignCreateTicket ~ error:', error)
    }
  }
}
