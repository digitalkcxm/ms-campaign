import ErrorHelper from '../helper/ErrorHelper.js'

export default class CampaignVersionModel {
  constructor(database = {}) {
    this.database = database
  }

  async create(obj) {
    try {
      const result = await this.database('campaign_version')
        .returning(['id', 'id_company', 'id_workflow', 'id_campaign', 'id_status', 'created_by', 'canceled_by', 'draft', 'repeat', 'start_date', 'repetition_rule', 'filter', 'negotiation', 'active', 'created_at', 'updated_at'])
        .insert(obj)

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignVersionModel', 'create', 'An error occurred when trying create campaign version.', { obj }, err)
    }
  }

  async update(id_campaign, canceled_by) {
    try {
      const result = await this.database('campaign_version')
        .returning(['id', 'id_company', 'id_workflow', 'id_campaign', 'id_status', 'created_by', 'canceled_by', 'draft', 'repeat', 'start_date', 'repetition_rule', 'filter', 'negotiation', 'active', 'created_at', 'updated_at'])
        .update({ canceled_by, active: false })
        .where({ id_campaign })

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignVersionModel', 'create', 'An error occurred when trying create campaign version.', { obj }, err)
    }
  }
}
