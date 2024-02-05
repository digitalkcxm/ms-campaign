import moment from 'moment'
import { status } from '../model/Enumarations.js'
import ErrorHelper from '../helper/ErrorHelper.js'
import CampaignVersionModel from '../model/CampaignVersionModel.js'

export default class CampaignVersionController {
  constructor(database = {}) {
    this.campaignVersionModel = new CampaignVersionModel(database)
  }

  async create(id_company, id_workflow, id_campaign, created_by, draft, repeat, start_date, repetition_rule, filter) {
    const campaignVersion = {}
    try {
      await this.campaignVersionModel.update(id_campaign, created_by)

      campaignVersion.id_company = id_company
      campaignVersion.id_workflow = id_workflow
      campaignVersion.id_campaign = id_campaign
      campaignVersion.id_status = draft ? status.draft : status.scheduled
      campaignVersion.created_by = created_by
      campaignVersion.draft = draft
      campaignVersion.repeat = repeat
      campaignVersion.start_date = start_date || moment().format()
      campaignVersion.repetition_rule = JSON.stringify(repetition_rule)
      campaignVersion.filter = JSON.stringify(filter)

      return await this.campaignVersionModel.create(campaignVersion)
    } catch (err) {
      throw new ErrorHelper('CampaignVersionController', 'Create', 'An error occurred when trying creating campaign version.', { id_company, id_workflow, id_campaign, created_by, draft, repeat, start_date, repetition_rule, filter }, err)
    }
  }
}
