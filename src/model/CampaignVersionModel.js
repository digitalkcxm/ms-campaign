import ErrorHelper from '../helper/ErrorHelper.js'
import campaign from '../routes/campaign.js'

export default class CampaignVersionModel {
  constructor(database = {}) {
    this.database = database
  }

  async create(obj) {
    try {
      const result = await this.database('campaign_version')
        .returning([
          'id',
          'id_company',
          'id_workflow',
          'id_campaign',
          'id_status',
          'created_by',
          'canceled_by',
          'draft',
          'repeat',
          'start_date',
          'repetition_rule',
          'filter',
          'negotiation',
          'active',
          'created_at',
          'updated_at',
          'end_date',
          'id_phase',
          'ignore_open_tickets',
          'first_message',
          'negotiation'
        ])
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

  async updateStatus(id, id_status) {
    try {
      const result = await this.database('campaign_version')
        .returning(['id', 'id_company', 'id_workflow', 'id_campaign', 'id_status', 'created_by', 'canceled_by', 'draft', 'repeat', 'start_date', 'repetition_rule', 'filter', 'negotiation', 'active', 'created_at', 'updated_at'])
        .update({ id_status })
        .where({ id })

      return result[0]
    } catch (err) {
      console.log('🚀 ~ CampaignVersionModel ~ updateStatus ~ err:', err)
    }
  }

  async getByID(id) {
    try {
      // let query = this.database('campaign')
      // .select({
      //   id: 'campaign.id',
      //   name: 'campaign.name',
      //   repeat: 'campaign_version.repeat',
      //   created_by: 'campaign.created_by',
      //   created_at: 'campaign.created_at',
      //   start_date: 'campaign_version.start_date',
      //   status: 'campaign.id_status',
      //   active: 'campaign.active',
      //   total: 'campaign.total'
      // })
      // .innerJoin('campaign_version', 'campaign_version.id_campaign', 'campaign.id')
      // .innerJoin('company', 'company.id', 'campaign.id_company')
      // .where({ 'campaign.id_company': id_company, 'campaign_version.active': true })
      // .orderBy([{
      //   column: 'campaign.created_at',
      //   order: 'desc',
      //   nulls: 'last' }
      // ])
      // .limit(limit)
      // .offset(offset)


      const result = await this.database('campaign_version')
        .select({
          id: 'campaign_version.id',
          id_company: 'campaign_version.id_company',
          id_workflow: 'campaign_version.id_workflow',
          id_campaign: 'campaign_version.id_campaign',
          id_status: 'campaign_version.id_status',
          created_by: 'campaign_version.created_by',
          canceled_by: 'campaign_version.canceled_by',
          draft: 'campaign_version.draft',
          repeat: 'campaign_version.repeat',
          start_date: 'campaign_version.start_date',
          repetition_rule: 'campaign_version.repetition_rule',
          filter: 'campaign_version.filter',
          negotiation: 'campaign_version.negotiation',
          active: 'campaign_version.active',
          created_at: 'campaign_version.created_at',
          updated_at: 'campaign_version.updated_at',
          end_date: 'campaign_version.end_date',
          id_phase: 'campaign_version.id_phase',
          first_message: 'campaign_version.first_message',
          campaign_name: 'campaign.name'
        })
        .innerJoin('campaign', 'campaign_version.id_campaign', 'campaign.id')
        .where({ 'campaign_version.id': id })

      return result[0]
    } catch (err) {
      console.log('🚀 ~ CampaignVersionModel ~ getByID ~ err:', err)
    }
  }
}
