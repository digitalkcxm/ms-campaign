import { status } from '../model/Enumarations.js'
import ErrorHelper from '../helper/ErrorHelper.js'
import WorkflowModel from '../model/WorkflowModel.js'
import MessageController from './MessageController.js'
import CompanyService from '../service/CompanyService.js'
import WorkflowService from '../service/WorkflowService.js'
import RabbitMQService from '../service/RabbitMQService.js'
import CRMManagerService from '../service/CRMManagerService.js'
import CampaignVersionController from './CampaignVersionController.js'

export default class WorkflowController {
  constructor(database = {}, logger = {}) {
    this.companyService = new CompanyService()
    this.workflowModel = new WorkflowModel(database)
    this.workflowService = new WorkflowService(logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
    this.messageController = new MessageController()
  }

  async getIDWorkflow(id_company, id_workflow) {
    try {
      const getID = await this.workflowModel.getWorkflowID(id_company, id_workflow)

      if(getID.length > 0) return getID[0].id

      const result = await this.workflowModel.createWorkflowID(id_company, id_workflow)

      return result[0].id
    } catch (err) {
      throw new ErrorHelper('WorkflowController', 'getIDWorkflow', 'An error occurred when trying get workflow id.', { id_company, id_workflow }, err)
    }
  }

  async sendQueueCreateTicket(company, tenantID, id_phase, id_campaign, id_campaign_version, leads, end_date, id_workflow, ignore_open_tickets, negotiation, created_by) {
    try {
      const getTemplate = await CRMManagerService.getPrincipalTemplateByCustomer(company, tenantID)

      await Promise.all(leads.map(lead => RabbitMQService.sendToExchangeQueue('campaign_create_ticket', 'campaign_create_ticket', {
        company,
        tenantID,
        id_phase,
        end_date,
        name: lead.nome,
        id_campaign,
        id_campaign_version,
        id_workflow,
        ignore_open_tickets,
        negotiation,
        message: lead.message,
        created_by,
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

  async createTicket(company, tenantID, id_phase, end_date, name, id_campaign, id_campaign_version, id_workflow, crm, ignore_open_tickets, negotiation, message, created_by) {
    try {
      const checkCampaign = await this.campaignVersionController.getByID(id_campaign_version)
      if(checkCampaign.id_status == status.canceled || checkCampaign.id_status == status.draft || checkCampaign.id_status == status.finished) return true

      const getDetailsCompany = await this.companyService.getBytoken(company)

      if(ignore_open_tickets) {
        const checkOpenTickets = await this.#checkOpenTickets(company, crm.id_crm)
        if(checkOpenTickets) return true
      }

      const createTicket = await this.workflowService.createTicket(company, name, id_phase, created_by)

      await this.workflowService.linkCustomer(company, createTicket.id, crm.template, crm.table, crm.column, String(crm.id_crm))

      if(negotiation) {
        this.#createNegotiation(company, tenantID, crm.id_crm, createTicket.id_seq, negotiation)
      }

      if(message) {
        this.messageController.sendMessage(company, tenantID, createTicket, crm, message)
      }

      if(end_date) {
        this.workflowService.setSLA(company, createTicket.id, id_workflow, checkCampaign.end_date)
      }

      RabbitMQService.sendToExchangeQueue(`automation:events:${getDetailsCompany.name}`, `automation:events:${getDetailsCompany.name}`, {
        event: 'create_ticket',
        id_ticket: createTicket.id
      })

      return true
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ createTicket ~ err:', err)
    }
  }

  async #checkOpenTickets(company, id_crm) {
    try {
      const checkOpenTickets = await this.workflowService.checkOpenTickets(company, id_crm)
      if(!checkOpenTickets || checkOpenTickets.length <= 0) return false

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

      if(data.length <= 0) return true

      const createNegotiation = await Promise.all(data.map(async item => {
        const obj = {
          template_id: item.template,
          data: item.values,
          created_by: 0
        }

        if(item.fk) obj.data[item.fk] = createMainNegotiation.id

        return await CRMManagerService.createSingleJSON(company, tenantID, obj)
      }))

      return { createMainNegotiation, createNegotiation }
    } catch (err) {
      console.log('🚀 ~ WorkflowController ~ createNegotiation ~ err:', err)
    }
  }
}
