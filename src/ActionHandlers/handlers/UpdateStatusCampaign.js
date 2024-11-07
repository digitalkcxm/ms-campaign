import CampaignModel from '../../model/CampaignModel.js'
import CampaignVersionModel from '../../model/CampaignVersionModel.js'
import { status } from '../../model/Enumerations.js'
import IActionHandler from '../abstracts/IActionHandler.js'

export default class UpdateStatusCampaignActionHandler extends IActionHandler {

  constructor(database, redis, logger) {
    super('UpdateStatusCampaignActionHandler')
    this.database = database
    this.redis = redis
    this.logger = logger

    this.models = {
      campaign: new CampaignModel(database),
      cVersion: new CampaignVersionModel(database)
    }
  }

  async handleAction({ company, campaign_id, campaign_version_id, data }) {
    try {
      const checkCampaign = await this.models.campaign.getByID(company.id, campaign_id)
      if ([status.canceled, status.draft, status.finished].includes(checkCampaign?.[0].status)) {
        return true
      }

      await Promise.all([
        this.models.cVersion.updateStatus(campaign_version_id, data.status),
        this.models.campaign.update(campaign_id, {
          id_status: data.status
        })
      ])

      return true
    } catch (err) {
      console.error(`[${this.actionName}.handleAction]`, err)
      return false
    }
  }

}