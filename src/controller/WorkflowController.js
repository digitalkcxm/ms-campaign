import ErrorHelper from '../helper/ErrorHelper.js'
import WorkflowModel from '../model/WorkflowModel.js'
import CompanyService from '../service/CompanyService.js'
import WorkflowService from '../service/WorkflowService.js'
import RabbitMQService from '../service/RabbitMQService.js'
import { status, channel } from '../model/Enumarations.js'
import CRMManagerService from '../service/CRMMangerService.js'
import CampaignVersionController from './CampaignVersionController.js'
import CampaignModel from '../model/CampaignModel.js'

export default class WorkflowController {
  constructor(database = {}, logger = {}) {
    this.campaignModel = new CampaignModel(database)
    this.companyService = new CompanyService()
    this.workflowModel = new WorkflowModel(database)
    this.workflowService = new WorkflowService(logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
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

  async sendQueueCreateTicket(company, tenantID, id_phase, id_campaign, id_campaign_version, leads, end_date, id_workflow) {
    try {
      const getTemplate = await CRMManagerService.getPrincipalTemplateByCustomer(company, tenantID)

      await Promise.all(leads.map(lead => RabbitMQService.sendToExchangeQueue('campaign_create_ticket', 'campaign_create_ticket', {
        company,
        id_phase,
        end_date,
        name: lead.nome,
        id_campaign,
        id_campaign_version,
        id_workflow,
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

  async createTicket(company, id_phase, end_date, name, id_campaign, id_campaign_version, id_workflow, crm) {
    try {
      const checkCampaign = await this.campaignVersionController.getByID(id_campaign_version)
      if (checkCampaign.id_status == status.canceled || checkCampaign.id_status == status.draft || checkCampaign.id_status == status.finished) return true

      const getDetailsCompany = await this.companyService.getBytoken(company)

      const origin = {
        name: 'Campaign',
        channel: checkCampaign.first_message[0]?.type || '',
        url: '',
        description: '',
      }

      const createTicket = await this.workflowService.createTicket(company, name, id_phase, origin)

      if(!createTicket.id){
        console.log('🚀 ~ WorkflowController ~ createTicket ~ err:', createTicket)
        return false
      }

      await this.workflowService.linkCustomer(company, createTicket.id, crm.template, crm.table, crm.column, String(crm.id_crm))

      if (end_date) {
        this.workflowService.setSLA(company, createTicket.id, id_workflow, checkCampaign.end_date)
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
}
