import moment from 'moment'

import ErrorHelper from '../helper/ErrorHelper.js'
import CompanyModel from '../model/CompanyModel.js'
import CampaignModel from '../model/CampaignModel.js'
import WorkflowController from './WorkflowController.js'
import { status, statusByID } from '../model/Enumarations.js'
import CRMManagerService from '../service/CRMManagerService.js'
import CampaignVersionController from './CampaignVersionController.js'
import S3 from '../config/S3.js'
import { URL } from 'url'

export default class CampaignController {
  constructor(database = {}, logger = {}) {
    this.companyModel = new CompanyModel(database)
    this.campaignModel = new CampaignModel(database)
    this.workflowController = new WorkflowController(database, logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
    this.S3 = new S3()
  }

  async getAll(company, search, searchStatus, size = 50, page = 0) {
    try {
      const obj = {}
      const searchStatusID = []
      const offset = page <= 0 ? 0 : size * page

      if (searchStatus) {
        for (const item of searchStatus) {
          const id = status[item.toLowerCase()]
          id && searchStatusID.push(id)
        }
      }

      const resultData = await this.campaignModel.getAll(company.id, search, searchStatusID, size, offset)
      const count = await this.campaignModel.count(company.id, search, searchStatusID)

      obj.data = resultData.map(item => {
        item.created_at = moment(item.created_at).format('DD/MM/YYYY HH:mm:ss')
        item.start_date = moment(item.start_date).format('DD/MM/YYYY HH:mm:ss')
        item.status = statusByID[item.status]
        item.total_registrations = item.total

        return item
      })


      obj.pagination = {
        last_page: parseInt(count) < parseInt(size) ? 0 : (Math.floor(parseInt(count) / parseInt(size))),
        first_page: 0,
        current_page: parseInt(page),
        page_size: parseInt(size),
        total_rows: parseInt(count)
      }

      return obj
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'getAll', 'An error occurred when trying get campaign.', { company }, err)
    }
  }

  async getByID(company, id) {
    try {
      const result = await this.campaignModel.getByID(company.id, id)
      if (result.length <= 0) return []

      result[0].created_at = moment(result[0].created_at).format('DD/MM/YYYY HH:mm:ss')
      result[0].start_date = moment(result[0].start_date).format('DD/MM/YYYY HH:mm:ss')
      result[0].end_date = result[0].end_date || result[0].end_date != null ? moment(result[0].end_date).format('DD/MM/YYYY HH:mm:ss') : ''
      result[0].status = statusByID[result[0].status]

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'getByID', 'An error occurred when trying get campaign by id.', { company, id }, err)
    }
  }

  async create(company, tenantID, name, created_by, id_workflow, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation, file_url) {
    const campaign = {}
    try {
      campaign.id_company = company.id
      campaign.id_workflow = await this.workflowController.getIDWorkflow(company.id, id_workflow)
      campaign.id_status = draft ? status.draft : status.scheduled
      campaign.id_tenant = tenantID
      campaign.name = name
      campaign.created_by = created_by
      campaign.draft = draft

      const createCampaign = await this.campaignModel.create(campaign)

      const createVersion = await this.campaignVersionController.create(company.id, campaign.id_workflow, createCampaign.id, created_by, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation, file_url)

      return {
        id: createCampaign.id,
        name: createCampaign.name,
        repeat: createVersion.repeat,
        created_by: createCampaign.created_by,
        created_at: moment(createCampaign.created_at).format('DD/MM/YYYY HH:mm:ss'),
        start_date: moment(createVersion.start_date).format('DD/MM/YYYY HH:mm:ss'),
        status: statusByID[createCampaign.id_status],
        total_registrations: 0,
        active: createCampaign.active,
        end_date: moment(createVersion.end_date).format('DD/MM/YYYY HH:mm:ss'),
        id_phase: createVersion.id_phase,
        ignore_open_tickets: createVersion.ignore_open_tickets,
        first_message: createVersion.first_message,
        negotiation: createVersion.negotiation
      }
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'Create', 'An error occurred when trying creating campaign.', { company, tenantID, name, created_by, id_workflow, draft, repeat, start_date, repetition_rule, filter }, err)
    }
  }

  async update(company, id, name, id_workflow, repetition_rule, edited_by, start_date, draft, repeat, active, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation) {
    try {
      const newCampaign = {}

      newCampaign.id_workflow = await this.workflowController.getIDWorkflow(company.id, id_workflow)
      newCampaign.id_status = draft ? status.draft : status.scheduled
      newCampaign.name = name
      newCampaign.edited_by = edited_by
      newCampaign.draft = draft
      newCampaign.active = active
      newCampaign.updated_at = moment().format()

      const updateCampaign = await this.campaignModel.update(id, newCampaign)

      const createVersion = await this.campaignVersionController.create(company.id, newCampaign.id_workflow, updateCampaign.id, edited_by, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation)

      return {
        id: updateCampaign.id,
        name: updateCampaign.name,
        repeat: createVersion.repeat,
        created_by: updateCampaign.created_by,
        created_at: moment(updateCampaign.created_at).format('DD/MM/YYYY HH:mm:ss'),
        start_date: moment(createVersion.start_date).format('DD/MM/YYYY HH:mm:ss'),
        status: statusByID[updateCampaign.id_status],
        total_registrations: 0,
        active: updateCampaign.active,
        end_date: moment(createVersion.end_date).format('DD/MM/YYYY HH:mm:ss'),
        id_phase: createVersion.id_phase,
        ignore_open_tickets: createVersion.ignore_open_tickets,
        first_message: createVersion.first_message,
        negotiation: createVersion.negotiation
      }
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'Update', 'An error occurred when trying updating campaign.', { company, id, name, id_workflow, repetition_rule, edited_by, start_date, draft, active, filter }, err)
    }
  }

  async executeCampaign(company_id, campaign_id, campaign_version_id) {
    let negotiation = false

    try {
      const checkCampaign = await this.campaignModel.getByID(company_id, campaign_id)
      if (checkCampaign[0].status == status.canceled || checkCampaign[0].status == status.draft || checkCampaign[0].status == status.finished) return true

      const consult = await Promise.all([
        this.campaignModel.update(campaign_id, { id_status: status.running }),
        this.getByID({ id: company_id }, campaign_id),
        this.companyModel.getByID(company_id),
        this.campaignVersionController.updateStatus(campaign_version_id, status.running)
      ])

      const getByID = consult[1]
      const getCompany = consult[2]

      if (getByID.campaign_version_id != campaign_version_id) return true

      let getLeads = await this.#getLeads(getByID, getCompany)

      if (getLeads?.error) {
        await Promise.all([
          this.campaignModel.update(campaign_id, { id_status: status.error }),
          this.campaignVersionController.updateStatus(campaign_version_id, status.error)
        ])
        return false
      }

      if (!getLeads || getLeads == null || getLeads.length <= 0) {
        await Promise.all([
          this.campaignModel.update(campaign_id, { id_status: status.finished }),
          this.campaignVersionController.updateStatus(campaign_version_id, status.finished)
        ])
        return true
      }

      if (getByID.first_message?.length > 0) {
        getLeads = this.#prepareMessage(getLeads, getByID.first_message)
      }

      if (getByID.negotiation?.length > 0) {
        negotiation = await this.#prepareBusiness(getCompany[0].token, getByID.id_tenant, getByID.negotiation)
      }

      const campaign_type = getByID.file_url ? 'file' : 'crm'
      this.campaignModel.update(campaign_id, { total: getLeads.length })
      this.workflowController.sendQueueCreateTicket(getCompany[0].token, getByID.id_tenant, getByID.id_phase, getByID.id, getByID.campaign_version_id, getLeads, getByID.end_date, getByID.id_workflow, getByID.ignore_open_tickets, negotiation, getByID.created_by, campaign_type)

      return true
    } catch (err) {
      console.log('Error => ', err)
      return false
    }
  }

  async updateStatusCampaign(company, campaign_id, campaign_version_id, id_status) {
    try {
      const getCompany = await this.companyModel.getByToken(company)
      const checkCampaign = await this.campaignModel.getByID(getCompany[0].id, campaign_id)
      if (checkCampaign[0].status == status.canceled || checkCampaign[0].status == status.draft || checkCampaign[0].status == status.finished) return true

      return await Promise.all([
        this.campaignModel.update(campaign_id, { id_status }),
        this.campaignVersionController.updateStatus(campaign_version_id, id_status)
      ])
    } catch (err) {
      console.log('🚀 ~ CampaignController ~ updateStatusCampaign ~ err:', err)
    }
  }

  async #prepareBusiness(company, tenantID, negotiation) {
    const newNegotiation = {}

    try {
      const getData = await Promise.all([
        CRMManagerService.getPrincipalTemplateByBusiness(company, tenantID),
        CRMManagerService.getAllTables(company, tenantID)
      ])

      const principalTemplateBusiness = getData[0]
      const allTables = getData[1]

      newNegotiation.main = this.#prepareMainBusiness(principalTemplateBusiness)
      newNegotiation.data = await this.#prepareForeignKey(company, tenantID, allTables, newNegotiation.main.name, negotiation)

      return newNegotiation
    } catch (err) {
      console.log('🚀 ~ CampaignController ~ prepareBusiness ~ err:', err)
    }
  }

  #prepareMainBusiness(template) {
    try {
      const obj = {}

      obj.template = template.id

      const customer = template.fields.filter(item => item.column == 'idcliente' || item.column == 'id_cliente')
      const ticket = template.fields.filter(item => item.column == 'idticket' || item.column == 'id_ticket')

      obj.name = template.table
      obj.id_cliente = customer.length > 0 ? customer[0].column : ''
      obj.id_ticket = ticket.length > 0 ? ticket[0].column : ''

      return obj
    } catch (err) {
      console.log('🚀 ~ CampaignController ~ #prepareMainBusiness ~ err:', err)

    }
  }

  async #prepareForeignKey(company, tenantID, allTables, table_target, negotiation) {
    try {
      return await Promise.all(negotiation.map(async item => {
        const template = await CRMManagerService.getTemplateByID(company, tenantID, item.template)
        const table = allTables.business.filter(table => table.table_name == template.table_name)

        if (table.length <= 0) return item

        const fk = table[0].relations.filter(relation => relation.table_target == table_target)

        if (fk.length <= 0) return item

        item.fk = fk[0].field

        return item
      }))
    } catch (err) {
      console.log('🚀 ~ CampaignController ~ #prepareForeignKey ~ err:', err)
    }
  }

  #prepareMessage(getLeads, firstMessages) {
    try {
      let newListLeads = []
      const length = getLeads.length

      for (const firstMessage of firstMessages) {
        let range = getLeads.splice(0, Math.round(firstMessage.volume * length / 100))
        newListLeads = newListLeads.concat(range.map(item => {
          return {
            ...item,
            message: firstMessage
          }
        }))
      }

      return newListLeads
    } catch (err) {
      console.log('🚀 ~ CampaignController ~ #prepareMessage ~ err:', err)
    }
  }

  async #getLeads(getByID, getCompany) {
    if (getByID.file_url) {
      const url = new URL(getByID.file_url)
      const path = url.pathname

      const contentFile = await this.S3.downloadFile(path.slice(1))

      let leads = []
      if (contentFile) {
        //TODO Fazer a validação da quantidade de itens em contentFile
        for (let i = 1; i < contentFile.length; i++) {
          const lineContent = contentFile[i].split(';')
          const lead = {
            nome: lineContent[0],
            contato: lineContent[1]
          }

          leads.push(lead)
        }
      }

      return leads
    }

    return await CRMManagerService.query(getCompany[0].token, getByID.id_tenant, getByID.filter)
  }
}
