import ErrorHelper from '../helper/ErrorHelper.js'

export default class CampaignModel {
  constructor(database = {}) {
    this.database = database
  }

  async count(id_company, search, status) {
    try {
      let query = this.database('campaign')
        .count('id')
        .where({ id_company, active: true })

      search && query.andWhere('name', 'ILIKE', `%${search}%`)
      status.length > 0 && query.andWhere('id_status', 'IN', status)

      const result = await query

      return result[0].count
    } catch (err) {
      console.log('🚀 ~ CampaignModel ~ count ~ err:', err)
      // throw new ErrorHelper('CampaignModel', 'count', 'An error occurred when trying counting campaign.', { }, err)
    }
  }

  async getAll(id_company, search, status, limit = 50, offset = 0) {
    try {
      let query = this.database('campaign')
        .select({
          id: 'campaign.id',
          name: 'campaign.name',
          repeat: 'campaign_version.repeat',
          created_by: 'campaign.created_by',
          created_at: 'campaign.created_at',
          start_date: 'campaign_version.start_date',
          status: 'campaign.id_status',
          active: 'campaign.active'
        })
        .innerJoin('campaign_version', 'campaign_version.id_campaign', 'campaign.id')
        .innerJoin('company', 'company.id', 'campaign.id_company')
        .where({ 'campaign.id_company': id_company, 'campaign_version.active': true })
        .orderBy([{
          column: 'campaign.created_at',
          order: 'desc',
          nulls: 'last' }
        ])
        .limit(limit)
        .offset(offset)

      search && query.andWhere('campaign.name', 'ILIKE', `%${search}%`)
      status.length > 0 && query.andWhere('campaign.id_status', 'IN', status)

      return await query

    } catch (err) {
      throw new ErrorHelper('CampaignModel', 'getAll', 'An error occurred when trying get campaign.', { id_company }, err)
    }
  }

  async getByID(id_company, id) {
    try {
      return await this.database('campaign')
        .select({
          id: 'campaign.id',
          name: 'campaign.name',
          id_workflow: 'workflow.id_workflow',
          repeat: 'campaign_version.repeat',
          repetition_rule: 'campaign_version.repetition_rule',
          created_by: 'campaign.created_by',
          created_at: 'campaign.created_at',
          start_date: 'campaign_version.start_date',
          status: 'campaign.id_status',
          active: 'campaign.active',
          filter: 'campaign_version.filter'
        })
        .innerJoin('campaign_version', 'campaign_version.id_campaign', 'campaign.id')
        .innerJoin('company', 'company.id', 'campaign.id_company')
        .innerJoin('workflow', 'workflow.id', 'campaign.id_workflow')
        .where({
          'campaign.id': id,
          'campaign.id_company': id_company,
          'campaign_version.active': true
        })
    } catch (err) {
      throw new ErrorHelper('CampaignModel', 'getAll', 'An error occurred when trying get campaign by id.', { id_company, id }, err)
    }
  }

  async create(obj) {
    try {
      const result = await this.database('campaign')
        .returning(['id', 'id_company', 'id_workflow', 'id_status', 'id_tenant', 'name', 'created_by', 'draft', 'active', 'created_at', 'updated_at'])
        .insert(obj)

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignModel', 'create', 'An error occurred when trying create campaign.', { obj }, err)
    }
  }

  async update(id, obj) {
    try {
      const result = await this.database('campaign')
        .returning(['id', 'id_company', 'id_workflow', 'id_status', 'id_tenant', 'name', 'created_by', 'draft', 'active', 'created_at', 'updated_at'])
        .update(obj)
        .where({ id })

      return result[0]
    } catch (err) {
      throw new ErrorHelper('CampaignModel', 'update', 'An error occurred when trying update campaign.', { obj }, err)
    }
  }
}
