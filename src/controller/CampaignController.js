import moment from 'moment'

import ErrorHelper from '../helper/ErrorHelper.js'
import CampaignModel from '../model/CampaignModel.js'
import WorkflowController from './WorkflowController.js'
import { status, statusByID } from '../model/Enumerations.js'
import CampaignVersionController from './CampaignVersionController.js'

export default class CampaignController {
  constructor(database = {}, logger = {}) {
    this.campaignModel = new CampaignModel(database)
    this.workflowController = new WorkflowController(database, logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
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

  async createCampaign({
    company, 
    tenantID, 
    name, 
    created_by, 
    id_workflow, 
    draft, 
    repeat, 
    start_date, 
    repetition_rule, 
    filter, 
    end_date, 
    id_phase, 
    ignore_open_tickets, 
    first_message, 
    negotiation, 
    file_url
  }) {
    const campaign = {}
    try {

      if (!first_message || first_message.length === 0 || !first_message[0]?.id_channel) {
        throw new Error('Canal da abordagem é obrigatório')
      }
      campaign.id_company = company.id
      campaign.id_workflow = await this.workflowController.verifyWorkflowID(company.id, id_workflow)
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

      newCampaign.id_workflow = await this.workflowController.verifyWorkflowID(company.id, id_workflow)
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
}
