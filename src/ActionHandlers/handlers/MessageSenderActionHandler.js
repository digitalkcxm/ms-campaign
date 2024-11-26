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

        const messageText = automation_message.message || automation_message.template.html_content

        // Formata Message
        const MessageFormatted = this.#formatMessage({
          messageText,
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

      case ChannelBrokerEnum.EmailMarketing:

        return success({
          data: {
            template: {
              id: automation_message?.template?.id,
              variables: this.#getTemplateVariables(automation_message, ticket, customer, business),
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

  #getTemplateVariables(
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
    const keysVariables = Object.keys(automation_message?.template?.variables || {})
    for (const key of keysVariables) {
      const variable = GetVariablesInfo(automation_message.template.variables[key])
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
    const variables = messageFormatted.match(/(?<!\{)\{\{[^{}]*\}\}(?!\})/g)
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
