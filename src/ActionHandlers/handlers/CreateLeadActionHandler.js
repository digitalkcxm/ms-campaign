/* eslint-disable indent */
import IActionHandler from '../abstracts/IActionHandler.js'
import CompanyService from '../../service/CompanyService.js'
import WorkflowService from '../../service/WorkflowService.js'
import { ActionTypeEnum, ChannelEnumIDs, status } from '../../model/Enumerations.js'
import CampaignModel from '../../model/CampaignModel.js'
import CampaignVersionModel from '../../model/CampaignVersionModel.js'
import { success, error } from '../../helper/patterns/ReturnPatters.js'
// import RabbitMQService from '../../service/RabbitMQService.js'

import mqConnection from '../../config/rabbitmq/rabbitmq-connection.js'

export default class CreateLeadActionHandler extends IActionHandler {
  constructor(database, redis, logger) {
    super('CreateLeadActionHandler')

    this.models = {
      campaign: new CampaignModel(database),
      cVersion: new CampaignVersionModel(database),
    }

    this.services = {
      company: new CompanyService(redis),
      workflow: new WorkflowService(logger),
    }
  }

  async handleAction({ company, campaign_id, campaign_version_id, data }) {
    try {
      const campaignInfo = await this.models.cVersion.getByID(campaign_version_id)
      if ([status.canceled, status.draft].includes(campaignInfo.id_status)) return true

      // Verifica se o lead possui atendimentos abertos
      if (data.ignore_open_tickets) {
        const hasOpenTickets = await this.#hasOpenTickets(data.company, data.customer)
        if (hasOpenTickets) return true
      }

      const Ticket = await this.#createTicket(company, campaignInfo, data)
      if (!Ticket.ok) {
        return false
      }

      const sendMessage = await this.#sendMessage(company, campaign_id, campaign_version_id, Ticket.data, data)
      if (!sendMessage.ok) {
        return false
      }

      return true
    } catch (err) {
      console.error('[CreateTicketAction | handleAction] CATCH: ', err)
    }
  }


  async #createTicket(company, campaignInfo, data) {
    try {

      const { id_channel } = data.automation_message
      const channel = ChannelEnumIDs[id_channel]

      const ticketPayload = {
        name: data.name,
        id_phase: data.id_phase,
        responsibles: [],
        origin: {
          name: 'Campaign',
          channel: channel,
          url: '',
          description: campaignInfo.campaign_name
        }
      }

      const createTicket = await this.services.workflow.createTicket(company.token, ticketPayload)
      if (!createTicket.ok) {
        console.error('[WorkflowController | createTicket] Erro na criação do ticket: ', createTicket)
        return false
      }

      await this.services.workflow.linkCustomer(company.token, createTicket.data.id, data.customer)

      const ticket = {
        ...createTicket.data,
        customer: (data.customer) ? {
          id_ticket: createTicket.data.id,
          ...data.customer
        } : null
      }

      // TODO: Implementar a negociação
      // if (data.negotiation) {
      //   this.#createNegotiation(data.company, data.tenantID, data.customer.id_crm, createTicket.id_seq, data.negotiation)
      // }

      mqConnection.sendToQueue(`campaign:events:${company.name}`, {
        event: 'create_ticket',
        data: ticket,
      })

      return success({ data: ticket })
    } catch (err) {
      console.error('[CreateTicketAction | createTicket] CATCH: ', err)
      return error({ message: 'Error on createTicket', error: err })
    }
  }

  async #sendMessage(company, campaign_id, campaign_version_id, ticket, data) {
    try {

      await mqConnection.sendToExchangeQueue('campaign_execution', 'campaign_execution', {
        type: ActionTypeEnum.SendMessage,
        company: company,
        campaign_id: campaign_id,
        campaign_version_id: campaign_version_id,
        data: {
          ticket: ticket,
          triggers: data.triggers,
          customer: data.lead?.customer,
          business: data.lead?.business,
          automation_message: data.automation_message,
        }
      })

      return success({ message: 'Message sent' })
    } catch (err) {
      console.error('[CreateTicketAction | sendMessage] CATCH: ', err)
      return error({ message: 'Error on sendMessage', error: err })
    }
  }

  async #hasOpenTickets(company, customer) {
    try {
      if (!customer) false

      const checkOpenTickets = await this.services.workflow.checkOpenTickets(company.token, customer)
      if (!checkOpenTickets || checkOpenTickets.length <= 0) return false

      return checkOpenTickets.filter(ticket => ticket.open).length > 0
    } catch (err) {
      console.error('[CreateTicketAction | hasOpenTickets] CATCH: ', err)
      throw new Error('Error on checkOpenTickets')
    }
  }
}
