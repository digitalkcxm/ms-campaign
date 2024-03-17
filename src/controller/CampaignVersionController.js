import moment from 'moment'
import { status } from '../model/Enumarations.js'
import ErrorHelper from '../helper/ErrorHelper.js'
import RabbitMQService from '../service/RabbitMQService.js'
import CampaignVersionModel from '../model/CampaignVersionModel.js'

export default class CampaignVersionController {
  constructor(database = {}, logger = {}) {
    this.logger = logger
    this.campaignVersionModel = new CampaignVersionModel(database)
  }

  async getByID(id) {
    try {
      return await this.campaignVersionModel.getByID(id)
    } catch (err) {
      console.log('🚀 ~ CampaignVersionController ~ getByID ~ err:', err)
    }
  }

  async create(id_company, id_workflow, id_campaign, created_by, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation) {

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
      campaignVersion.start_date = start_date ? moment(new Date(start_date)).format() : moment().format()
      campaignVersion.repetition_rule = JSON.stringify(repetition_rule)
      campaignVersion.filter = JSON.stringify(filter)
      campaignVersion.end_date = end_date ? moment(new Date(end_date)).format() : null
      campaignVersion.id_phase = id_phase
      campaignVersion.ignore_open_tickets = ignore_open_tickets
      campaignVersion.first_message = JSON.stringify(first_message)
      campaignVersion.negotiation = JSON.stringify(negotiation)

      const result = await this.campaignVersionModel.create(campaignVersion)

      await this.#scheduler(result.id_company, result.id_campaign, result.id, campaignVersion.start_date)

      return result
    } catch (err) {
      throw new ErrorHelper('CampaignVersionController', 'Create', 'An error occurred when trying creating campaign version.', { id_company, id_workflow, id_campaign, created_by, draft, repeat, start_date, repetition_rule, filter }, err)
    }
  }

  async updateStatus(id, id_status) {
    try {
      return await this.campaignVersionModel.updateStatus(id, id_status)
    } catch (err) {
      console.log('🚀 ~ CampaignVersionController ~ update ~ err:', err)
    }
  }

  async #scheduler(company_id, campaign_id, campaign_version_id, scheduled_date) {
    try {
      const now = moment()
      const scheduledDate = moment(scheduled_date)

      const schedulerInMilliseconds = scheduledDate.diff(now)

      const result = await RabbitMQService.sendToExchangeQueueDelayed('scheduling_campaign', 'scheduling_campaign', { company_id, campaign_id, campaign_version_id }, schedulerInMilliseconds)
      this.logger.info(result)

      return true
    } catch (err) {
      throw new ErrorHelper('ActionController', '#scheduler', 'A scheduler error has occurred.', { company_id, campaign_id, campaign_version_id, scheduled_date }, err)
    }
  }
}
