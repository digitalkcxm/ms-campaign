import GetValue from '../../helper/GetValueFromVariable.js'
import GetVariablesInfo from '../../helper/GetVariablesInfo.js'
import { error, success } from '../../helper/patterns/ReturnPatters.js'
import CampaignModel from '../../model/CampaignModel.js'
import CampaignVersionModel from '../../model/CampaignVersionModel.js'
import { ChannelBrokerEnum, GetChannelBroker } from '../../model/Enumerations.js'
import RabbitMQService from '../../service/RabbitMQService.js'
import IActionHandler from '../abstracts/IActionHandler.js'

export default class MessageSenderActionHandler extends IActionHandler {

  constructor(database, redis, logger) {
    super('MessageSenderActionHandler')
    this.database = database
    this.redis = redis
    this.logger = logger

    this.models = {
      campaign: new CampaignModel(database),
      cVersion: new CampaignVersionModel(database)
    }
  }


  // PARAR EXECUÇAO PARA REVISAO DO FLUXO
  async handleAction({ company, data }) {
    try {
      const {
        ticket,   // Instancia do ticket
        customer, // Informação da tabela de cliente
        business, // Informação da tabela de negócio
        triggers,  // contato para envio de mensagem
        automation_message, // Config de mensagem da automação
      } = data

      // Config do canal para envio de mensagem
      const ChannelConfig = {
        token: automation_message.channel_token,
        channel_id: automation_message.id_channel,
        broker_id: automation_message.id_broker
      }

      for (const trigger of triggers) {
        // Resgata detalhes do canal
        const ChannelDetails = this.#GetChannelDetails({
          channel_id: ChannelConfig.channel_id,
          broker_id: ChannelConfig.broker_id,
          ticket,
          customer,
          business,
          trigger,
          automation_message,
        })

        // Formata Message
        const MessageFormatted = this.#formatMessage({
          messageText: automation_message.message,
          ticket,
          customer,
          business
        })

        await RabbitMQService.sendToQueue(`campaign:send_messages:${company.name}`, {
          token: ChannelConfig.token,
          ticket: ticket,
          channel_id: ChannelConfig.channel_id,
          broker_id: ChannelConfig.broker_id,
          trigger: trigger,
          message: MessageFormatted.data,
          ...ChannelDetails?.data
        })
      }

      return true
    } catch (err) {
      console.error(`[${this.actionName}.handleAction]`, err)
      return false
    }
  }

  #GetChannelDetails({
    channel_id,
    broker_id,
    ticket,
    customer,
    business,
    trigger,
    automation_message,
  }) {
    try {
      const channelBroker = GetChannelBroker(channel_id, broker_id)
      switch (channelBroker) {
        case ChannelBrokerEnum.EmailImap:
          return success({
            data: {
              // subject: '', 
              to: trigger,
              cc: '',
              bcc: '',
            }
          })
        case ChannelBrokerEnum.WhatsappOficial:
          return success({
            data: {
              hsm: {
                type: automation_message?.hsm?.type || 'text',
                file: automation_message?.hsm?.file,
                whatsapp_id: automation_message?.hsm?.whatsapp_id,
                template_message_id: automation_message?.hsm?.value,
                phrase: automation_message?.hsm?.phrase,
                language: automation_message?.hsm?.language || 'pt_BR',
                variables: this.#getHSMVariables(automation_message, ticket, customer, business),
              }
            }
          })

        default:
          return success({ data: {} })
      }
    } catch (err) {
      console.error(`[${this.actionName}.#GetChannelDetails]`, err)
      return error({ message: 'Erro ao resgatar detalhes do canal.', error: err })
    }

  }

  #getHSMVariables(
    automation_message,
    ticket,
    customer,
    business
  ) {

    const variablesFormatted = {}
    const scopes = {
      ticket,
      crm: customer,
      customer,
      business,
    }

    const keysVariables = Object.keys(automation_message?.hsm?.variable || {})
    for (const key of keysVariables) {
      const variable = GetVariablesInfo(automation_message.hsm_variables[key])
      const data = scopes?.[variable.type]
      const value = GetValue(variable.path, data)

      variablesFormatted[key] = value || ''
    }

    return variablesFormatted
  }

  #formatMessage({ messageText, ticket, customer, business }) {

    let messageFormatted = messageText || ''
    const scopes = {
      ticket,
      crm: customer,
      customer,
      business,
    }

    // Pega todas as variáveis do texto
    const variables = messageFormatted.match(/{{(.*?)}}/g)
    if (!variables?.length)
      return success({ data: messageFormatted })

    for (const variable of variables) {
      const varInfo = GetVariablesInfo(variable)
      const data = scopes?.[varInfo.type]
      const value = GetValue(variable.path, data)

      messageFormatted = messageFormatted.replace(variable, value)
    }

    return success({ data: messageFormatted })
  }



}

/*
async Execute() {
  try {      

    // Código temporário para manter compatibilidade com o fluxo antigo
    if (!this.action.stepDetails?.broker_id) {
      const getBroker = this.#channel_parser(this.action.stepDetails.channel)
      if (!getBroker) {
        await this.UpdateStep(Status.Error, { 
          output: StepErrorOutputPattern({
            message_code: BusinessError.UnknownErrorCode(),
            message: 'Canal não encontrado na automação.'
          })
        })
        return true
      }

      this.action.stepDetails.broker_id = getBroker
    }

    const trigger = await this.#getTrigger()
    if (!trigger.ok || !trigger?.data?.length) {
      await this.UpdateStep(Status.Error, { output: trigger })
      return true
    }

    // Arruma as varioáveis de gupshup
    const HSMVariables = await this.#getHSMVariables()
    if(!HSMVariables.ok) {
      await this.UpdateStep(Status.Error, { output: HSMVariables })
      return true
    }

    // Arruma as varioáveis do texto da mensagem
    const MessageFormatted = await this.#formatMessage()
    if (!MessageFormatted.ok) {
      await this.UpdateStep(Status.Error, { output: MessageFormatted })
      return true
    }
    
    const FileFormatted = Array.isArray(this.action.stepDetails?.content?.files) ? 
      this.action.stepDetails.content.files : 
      JSON.parse(this.action.stepDetails?.content?.files || '[]')

    const Payload = {
      id_ticket: this.action.id_ticket,
      id_phase: this.action.id_phase,
      id_step: this.action.step.id,
      event: ActionType.interaction,
      data: []
    }
    
    for(const contact of trigger.data) {
      Payload.data.push({
        token: this.action.stepDetails?.token || '', // Necessário para manter compatiblidade com o fluxo antigo
        channel_id: this.action.stepDetails.channel_id,
        broker_id: this.action.stepDetails.broker_id,
        trigger: contact,
        files: FileFormatted,
        message: MessageFormatted.data,
        hsm_variables: HSMVariables.data,
        hsm_template_message_id: this.action.stepDetails?.content?.template_message_id,
        subject: this.action.stepDetails?.content?.title || '',
        to: contact,
        cc: '',
        bcc: '',
      })
    }

    await this.UpdateStep(Status.Running, { output: { error: false, data: Payload }, scheduled: false })

    const company = await new CompanyService(this.redis).getBytoken(this.action.instance.token)
    await RabbitMQService.sendToExchangeQueue(`automation:events:${company.name}`, `automation:events:${company.name}`, Payload)

    return true
  } catch (err) {
    this.LogError(err, 'Error on InteractionTicketAction.Execute()')
    return false
  }
}
*/



/*


#buildMessagePayload(getDetailsCompany, checkCampaign, ticket, channel_id, data) {
    return {
      company: {
        id: getDetailsCompany.id,
        name: getDetailsCompany.name,
        token: getDetailsCompany.token,
      },
      tenantID: data.tenantID,
      ticket,
      crm: data.crm,
      message: data.message,
      contato: data.contato,
      req_user_id: data.created_by,
      channel: {
        id: channel_id,
        token: checkCampaign.first_message[0]?.channel_token,
        broker_id: checkCampaign.first_message[0]?.id_broker,
      },
      workflow_id: data.id_workflow,
      hsm: checkCampaign.first_message[0]?.hsm,
    }
  }


*/