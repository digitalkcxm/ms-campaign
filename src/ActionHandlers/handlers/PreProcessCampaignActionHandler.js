import CampaignController from '../../controller/CampaignController.js'
import GetLeads from '../../helper/GetLeads.js'
import { error, sucess } from '../../helper/patterns/ReturnPatters.js'
import CampaignModel from '../../model/CampaignModel.js'
import CampaignVersionModel from '../../model/CampaignVersionModel.js'
import CompanyModel from '../../model/CompanyModel.js'
import { ActionTypeEnum, status } from '../../model/Enumerations.js'
import CompanyService from '../../service/CompanyService.js'
import CRMManagerService from '../../service/CRMManagerService.js'
import RabbitMQService from '../../service/RabbitMQService.js'
import IActionHandler from '../abstracts/IActionHandler.js'

export default class PreProcessCampaignActionHandler extends IActionHandler {

  constructor(database, redis, logger) {
    super('PreProcessCampaign')

    this.controllers = {
      campaign: () => new CampaignController(database, logger),
    }

    this.models = {
      company: new CompanyModel(database),
      campaign: new CampaignModel(database),
      cVersion: new CampaignVersionModel(database),
    }

    this.services = {
      company: new CompanyService(redis),
    }
  }

  async handleAction({ company_id, campaign_id, campaign_version_id }) {
    try {
      const checkCampaign = await this.campaignModel.getByID(company_id, campaign_id)
      if ([status.canceled, status.draft, status.finished].includes(checkCampaign[0].status)) {
        return true
      }

      // Atualiza os status da campanha e da versão da campanha
      await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.running)

      // Pega as infos da campanha
      const company = await this.#GetCompanyFromService(company_id)
      const campaignInfo = this.controllers.campaign().getByID(company, campaign_id)
      if (campaignInfo.campaign_version_id != campaign_version_id) {
        console.error(`[${this.actionName}.handleAction] Campaign version is different from the one passed as parameter`, { input: campaign_version_id, output: campaignInfo.campaign_version_id })
        return true
      }

      // Pega os leads que serão acionados
      const Leads = await GetLeads(campaignInfo, company)
      if (!Leads?.ok) {
        console.error(`[${this.actionName}.handleAction] Error getting leads`, Leads)
        await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.error)
        return false
      }

      // Caso não haja leads, finaliza a campanha
      if (!Leads?.data?.result?.length) {
        console.log(`[${this.actionName}.handleAction] No Leads found`, Leads)
        await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.finished)
        return true
      }


      const LeadsPreProcessed = await this.#PreProcessLeads(campaignInfo, company, Leads.data.result)
      if (!LeadsPreProcessed.ok) {
        console.error(`[${this.actionName}.handleAction] Error PreProcessing Leads`, LeadsPreProcessed)
        await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.error)
        return false
      }


      await this.models.campaign.update(campaign_id, { total: LeadsPreProcessed.data.length })
      await this.#SendToQueueCreateTicket(company, campaignInfo, LeadsPreProcessed.data)
      return true

    } catch (err) {
      console.error(`[${this.actionName}.handleAction] Catch Error: `, err)
      return false
    }
  }

  async #GetCompanyFromService(company_id) {
    try {
      const companyFromModel = await this.models.company.getByID(company_id)
      return await this.services.company.getBytoken(companyFromModel[0].token)
    } catch (err) {
      console.error(`[${this.actionName}.#getCompanyFromService] Catch Error: `, err)
      return null
    }
  }

  async #UpdateCampaignStatus(campaign_id, campaign_version_id, status_id) {
    await Promise.all([
      this.models.campaign.update(campaign_id, { id_status: status_id }),
      this.models.cVersion.updateStatus(campaign_version_id, status_id)
    ])
  }

  async #PreProcessLeads(campaignInfo, company, leads) {
    try {

      let newListLeads = []
      const length = leads.length
      const firstMessages = campaignInfo.first_message

      for (const firstMessage of firstMessages) {
        let range = leads.splice(0, Math.round(firstMessage.volume * length / 100))
        newListLeads = newListLeads.concat(range.map(item => {
          return {
            ...item,
            message: firstMessage
          }
        }))
      }

      return sucess({ data: newListLeads })


      // TODO: Implementar a logica em cima da negociacao
      // if (getByID.negotiation?.length > 0) {
      //     negotiation = await this.#prepareBusiness(getCompany[0].token, getByID.id_tenant, getByID.negotiation)
      // }


    } catch (err) {
      console.error(`[${this.actionName}.#PreProcessLeads] Catch Error: `, err)
      return error({ message: 'Error PreProcessing Leads', error: err })
    }
  }

  async #SendToQueueCreateTicket(company, campaignInfo, LeadsPreProcessed) {
    try {
      const getTemplate = await CRMManagerService.getPrincipalTemplateByCustomer(company, campaignInfo.id_tenant)

      for (let lead of LeadsPreProcessed) {

        const customerLink = (lead?.id) ? {
          template: getTemplate.id,
          table: getTemplate.table,
          column: 'id',
          id_crm: lead.id
        } : null

        await RabbitMQService.sendToExchangeQueue('campaign_execution', 'campaign_execution', {
          type: ActionTypeEnum.CreateLead,
          company: company,
          campaign_id: campaignInfo.id,
          campaign_version_id: campaignInfo.campaign_version_id,
          data: {
            tenantID: campaignInfo.id_tenant,
            id_phase: campaignInfo.id_phase,
            end_date: campaignInfo.end_date,
            name: lead.nome,
            contato: lead.contato,
            id_workflow: campaignInfo.id_workflow,
            ignore_open_tickets: campaignInfo.ignore_open_tickets,
            negotiation: null, // TODO: precisa implementar o pre-processamento
            message: lead.message,
            created_by: campaignInfo.created_by,
            campaign_type: campaignInfo.file_url ? 'file' : 'crm',
            crm: customerLink
          }
        })
      }

      await RabbitMQService.sendToExchangeQueue('campaign_execution', 'campaign_execution', {
        type: ActionTypeEnum.UpdateStatusCampaign,
        company: company,
        campaign_id: campaignInfo.id,
        campaign_version_id: campaignInfo.campaign_version_id,
        data: {
          status: status.finished
        }
      })

      return true
    } catch (err) {
      console.error(`[${this.actionName}.#SendToQueueCreateTicket] Catch Error: `, err)
      return false
    }
  }
}

/*
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

  // TODO: NECESSITA OTIMIZAÇÃO
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
*/