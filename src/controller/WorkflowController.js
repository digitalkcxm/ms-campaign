import ErrorHelper from '../helper/ErrorHelper.js'
import WorkflowModel from '../model/WorkflowModel.js'
import MessageController from './MessageController.js'
import CompanyService from '../service/CompanyService.js'
import WorkflowService from '../service/WorkflowService.js'
import RabbitMQService from '../service/RabbitMQService.js'
import { MapIDs_ChannelNameEnum, status } from '../model/Enumerations.js'
import CRMManagerService from '../service/CRMManagerService.js'
import CampaignVersionController from './CampaignVersionController.js'
import CampaignModel from '../model/CampaignModel.js'


export default class WorkflowController {
  constructor(database = {}, logger = {}) {
    this.campaignModel = new CampaignModel(database)
    this.companyService = new CompanyService()
    this.workflowModel = new WorkflowModel(database)
    this.workflowService = new WorkflowService(logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
    this.messageController = new MessageController()
  }

  async getIDWorkflow(id_company, id_workflow) {
    try {
      const getID = await this.workflowModel.getWorkflowID(id_company, id_workflow)

      if (getID.length > 0) return getID[0].id

      const result = await this.workflowModel.createWorkflowID(id_company, id_workflow)

      return result[0].id
    } catch (err) {
      throw new ErrorHelper('WorkflowController', 'getIDWorkflow', 'An error occurred when trying get workflow id.', { id_company, id_workflow }, err)
    }
  }

  async sendQueueCreateTicket(company, tenantID, id_phase, id_campaign, id_campaign_version, leads, end_date, id_workflow, ignore_open_tickets, negotiation, created_by, campaign_type) {
    try {
      const getTemplate = await CRMManagerService.getPrincipalTemplateByCustomer(company, tenantID)

      let tickets = []
      for (const lead of leads) {
        const obj = {
          company,
          tenantID,
          id_phase,
          end_date,
          name: lead.nome,
          contato: lead.contato,
          id_campaign,
          id_campaign_version,
          id_workflow,
          ignore_open_tickets,
          negotiation,
          message: lead.message,
          created_by,
          campaign_type,
          crm: {
            template: getTemplate.id,
            table: getTemplate.table,
            column: 'id',
            id_crm: lead.id
          }
        }

        tickets.push(obj)
      }


      await Promise.all(leads.map(lead => RabbitMQService.sendToExchangeQueue('campaign_create_ticket', 'campaign_create_ticket', {
        company,
        tenantID,
        id_phase,
        end_date,
        name: lead.nome,
        contato: lead.contato,
        id_campaign,
        id_campaign_version,
        id_workflow,
        ignore_open_tickets,
        negotiation,
        message: lead.message,
        created_by,
        campaign_type,
        crm: {
          template: getTemplate.id,
          table: getTemplate.table,
          column: 'id',
          id_crm: lead.id
        }
      })))

      await RabbitMQService.sendToExchangeQueue('campaign_create_ticket', 'campaign_create_ticket', {
        type: 'update_status_campaign',
        company,
        id_campaign,
        id_campaign_version,
        status: status.finished
      })

      return true
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ createTicket ~ err:', err)

    }
  }

  async createTicket(data = { company, tenantID, id_phase, end_date, name, id_campaign, id_campaign_version, id_workflow, crm, ignore_open_tickets, negotiation, message, created_by, contato, campaign_type}) {
    try {
      const checkCampaign = await this.campaignVersionController.getByID(data.id_campaign_version)
      if (checkCampaign.id_status == status.canceled || checkCampaign.id_status == status.draft || checkCampaign.id_status == status.finished) return true

      const getDetailsCompany = await this.companyService.getBytoken(data.company)

      if (ignore_open_tickets) {
        const checkOpenTickets = await this.#checkOpenTickets(company, data.crm.id_crm)
        if (checkOpenTickets) return true
      }
      const channel_id = checkCampaign.first_message[0]?.id_channel
     
      if(!channel_id) {
        throw new Error('Channel not found')
      }
      const channel = MapIDs_ChannelNameEnum[channel_id]
 
      const createTicket = await this.workflowService.createTicket(data.company, data.name, data.id_phase, {
        name: 'Campaign',
        channel: channel,
        url: '',
        description: checkCampaign.campaign_name
      })

      console.log('🚀 ~ WorkflowController ~ createTicket ~ createTicket:', createTicket)

      if (!createTicket.id) {
        console.log('🚀 ~ WorkflowController ~ createTicket ~ err:', createTicket)
        return false
      }

      if (campaign_type == 'crm') {
        await this.workflowService.linkCustomer(data.company, createTicket.id, data.crm.template, data.crm.table, data.crm.column, String(data.crm.id_crm))
      }

      if (negotiation) {
        this.#createNegotiation(data.company, data.tenantID, data.crm.id_crm, createTicket.id_seq, data.negotiation)
      }

      if (message) {
        const data = {
          company: {
            id: getDetailsCompany.id,
            name: getDetailsCompany.name
          },
          tenantID: data.tenantID,
          ticket: createTicket,
          crm: data.crm,
          message: data.message,
          contato: data.contato,
          channel: {
            id: channel_id,
            token: checkCampaign.first_message[0]?.channel_token,
            broker_id: checkCampaign.first_message[0]?.broker_id,
          },
          workflow_id: data.id_workflow,
          hsm_id: checkCampaign.first_message[0]?.hsm_id,
        }
        this.messageController.sendMessage(data)
      }

      if (end_date) {
        this.workflowService.setSLA(data.company, createTicket.id, data.id_workflow, checkCampaign.end_date)
      }

      RabbitMQService.sendToExchangeQueue(`automation:events:${getDetailsCompany.name}`, `automation:events:${getDetailsCompany.name}`, {
        event: 'create_ticket',
        id_ticket: createTicket.id,
        origin
      })

      return true
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ createTicket ~ err:', err)
    }
  }
  

  async #checkOpenTickets(company, id_crm) {
    try {
      const checkOpenTickets = await this.workflowService.checkOpenTickets(company, id_crm)
      if (!checkOpenTickets || checkOpenTickets.length <= 0) return false

      return checkOpenTickets.filter(ticket => ticket.open).length > 0
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ checkOpenTickets ~ err:', err)
    }
  }

  async #createNegotiation(company, tenantID, customerID, ticketID, negotiation) {
    try {
      const { main, data } = negotiation

      const objMainNegotiation = {
        template_id: main.template,
        data: {},
        created_by: 0
      }

      objMainNegotiation.data[main.id_cliente] = customerID
      objMainNegotiation.data[main.id_ticket] = ticketID

      const createMainNegotiation = await CRMManagerService.createSingleJSON(company, tenantID, objMainNegotiation)

      if (data.length <= 0) return true

      const createNegotiation = await Promise.all(data.map(async item => {
        const obj = {
          template_id: item.template,
          data: item.values,
          created_by: 0
        }

        if (item.fk) obj.data[item.fk] = createMainNegotiation.id

        return await CRMManagerService.createSingleJSON(company, tenantID, obj)
      }))

      return { createMainNegotiation, createNegotiation }
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ createNegotiation ~ err:', err)
    }
  }
}
