import CampaignController from '../../controller/CampaignController.js'
import GetLeads from '../../helper/GetLeads.js'
import { error, success } from '../../helper/patterns/ReturnPatters.js'
import CampaignModel from '../../model/CampaignModel.js'
import CampaignVersionModel from '../../model/CampaignVersionModel.js'
import CompanyModel from '../../model/CompanyModel.js'
import { ActionTypeEnum, ChannelEnumIDs, status } from '../../model/Enumerations.js'
import CompanyService from '../../service/CompanyService.js'
import CRMManagerService from '../../service/CRMManagerService.js'
import RabbitMQService from '../../service/RabbitMQService.js'
import WorkflowServiceV2 from '../../service/WorkflowServiceV2.js'
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
      workflow: new WorkflowServiceV2(logger),
    }
  }

  async handleAction({ company_id, campaign_id, campaign_version_id }) {
    try {
      const checkCampaign = await this.models.campaign.getByID(company_id, campaign_id)
      // if ([status.canceled, status.draft, status.finished].includes(checkCampaign[0].status)) {
      //   return true
      // }

      // Atualiza os status da campanha e da versão da campanha
      await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.running)

      // Pega as infos da campanha
      const company = await this.#GetCompanyFromService(company_id)
      const campaignInfo = await this.controllers.campaign().getByID(company, campaign_id)
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
      
      const LeadsCriados = await this.#CreateLeads(company, campaignInfo, LeadsPreProcessed.data)
      if(!LeadsCriados.ok) {
        console.error(`[${this.actionName}.handleAction] Error Creating Leads`, LeadsCriados)
        await this.#UpdateCampaignStatus(campaign_id, campaign_version_id, status.error)
        return false
      }

      await this.models.campaign.update(campaign_id, { total: LeadsCriados.data.length })
      await this.#SendToPreProcessMessage(company, campaignInfo, LeadsCriados.data)

      return true
    } catch (err) {
      console.error(`[${this.actionName}.handleAction] Catch Error: `, err)
      return false
    }
  }

  async #GetCompanyFromService(company_id) {
    try {
      const companyFromModel = await this.models.company.getByID(company_id)
      const companyFromService = await this.services.company.getBytoken(companyFromModel[0].token)
      return {
        id: company_id,
        name: companyFromService.name,
        token: companyFromService.token,
      }
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

      return success({ data: newListLeads })


      // TODO: Implementar a logica em cima da negociacao
      // if (getByID.negotiation?.length > 0) {
      //     negotiation = await this.#prepareBusiness(getCompany[0].token, getByID.id_tenant, getByID.negotiation)
      // }


    } catch (err) {
      console.error(`[${this.actionName}.#PreProcessLeads] Catch Error: `, err)
      return error({ message: 'Error PreProcessing Leads', error: err })
    }
  }

  async #SendToPreProcessMessage(company, campaignInfo, leadsCreated) {
    try {
 
      for(const lead of leadsCreated) {
        await RabbitMQService.sendToExchangeQueue('campaign_execution', 'campaign_execution', {
          type: ActionTypeEnum.SendMessage,
          company: company,
          campaign_id: campaignInfo.id,
          campaign_version_id: campaignInfo.campaign_version_id,
          data: {
            ticket: lead.ticket,
            customer: lead.customer,
            business: lead.business,
            triggers: lead.contatos,
            automation_message: lead.automation_message,
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

  async #CreateLeads(company, campaignInfo, LeadsPreProcessed) {
    const {
      id_workflow,
      id_phase,
      ignore_open_tickets,
      name: campaign_name
    } = campaignInfo

    const { id_channel } = campaignInfo.first_message[0]
    const channel = ChannelEnumIDs[id_channel]

    const customerTemplate = await CRMManagerService.getPrincipalTemplateByCustomer(company.token, campaignInfo.id_tenant)
    const leadsCreated = await this.services.workflow.CreateTickets({
      id_workflow, 
      id_phase, 
      ignore_open_tickets, 
      campaign_name,
      is_mailing: !!campaignInfo.file_url, 
      leads: LeadsPreProcessed,
      customerTemplate,
      origin_channel: channel
    })
    if(!leadsCreated.ok) {
      return leadsCreated
    }

    for(let lead of leadsCreated.data) {
      await RabbitMQService.sendToQueue(`campaign:events:${company.name}`, {
        event: 'create_ticket',
        data: lead.ticket,
      })
    }

    return leadsCreated
  }
}

