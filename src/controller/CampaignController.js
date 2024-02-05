import moment from 'moment'
import { status, statusByID } from '../model/Enumarations.js'
import ErrorHelper from '../helper/ErrorHelper.js'
import CampaignModel from '../model/CampaignModel.js'
import WorkflowController from './WorkflowController.js'
import CampaignVersionController from './CampaignVersionController.js'

export default class CampaignController {
  constructor(database = {}) {
    this.campaignModel = new CampaignModel(database)
    this.workflowController = new WorkflowController(database)
    this.campaignVersionController = new CampaignVersionController(database)
  }

  async getAll(company, search, searchStatus, limit, offset) {
    try {
      const searchStatusID = []

      if(searchStatus) {
        for (const item of searchStatus) {
          const id = status[item.toLowerCase()]
          id && searchStatusID.push(id)
        }
      }

      const result = await this.campaignModel.getAll(company.id, search, searchStatusID, limit, offset)

      return result.map(item => {
        item.created_at = moment(item.created_at).format('DD/MM/YYYY HH:mm:ss')
        item.start_date = moment(item.start_date).format('DD/MM/YYYY HH:mm:ss')
        item.status = statusByID[item.status]
        item.total_registrations = 0

        return item
      })
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'getAll', 'An error occurred when trying get campaign.', { company }, err)
    }
  }

  async getByID(company, id) {
    try {
      const result = await this.campaignModel.getByID(company.id, id)
      if(result.length <= 0) return []

      result[0].created_at = moment(result[0].created_at).format('DD/MM/YYYY HH:mm:ss')
      result[0].start_date = moment(result[0].start_date).format('DD/MM/YYYY HH:mm:ss')
      result[0].status = statusByID[result[0].status]

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'getByID', 'An error occurred when trying get campaign by id.', { company, id }, err)
    }
  }

  async create(company, tenantID, name, created_by, id_workflow, draft, repeat, start_date, repetition_rule, filter) {
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

      const createVersion = await this.campaignVersionController.create(company.id, campaign.id_workflow, createCampaign.id, created_by, draft, repeat, start_date, repetition_rule, filter)

      return {
        id: createCampaign.id,
        name: createCampaign.name,
        repetition_rule: createVersion.repetition_rule,
        create_by: createCampaign.create_by,
        created_at: moment(createCampaign.created_at).format('DD/MM/YYYY HH:mm:ss'),
        start_date: moment(createVersion.start_date).format('DD/MM/YYYY HH:mm:ss'),
        status: statusByID[createCampaign.id_status],
        total_registrations: 0,
        active: createCampaign.active
      }
    } catch (err) {
      throw new ErrorHelper('CampaignController', 'Create', 'An error occurred when trying creating campaign.', { company, tenantID, name, created_by, id_workflow, draft, repeat, start_date, repetition_rule, filter }, err)
    }
  }

  async update() {}
}
