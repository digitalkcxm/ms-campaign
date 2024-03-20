import moment from 'moment'

import CRMController from './CRMController.js'
import CoreService from '../service/CoreService.js'

const crmController = new CRMController()
const coreService = new CoreService()

export default class MessageController {
  async sendMessage(company, tenantID, ticket, crm, message) {
    try {
      switch (message.type) {
      case 'waba':
        return await this.#waba(company, tenantID, ticket, crm, message)
      case 'sms':
        return await this.#sms(company, tenantID, ticket, crm, message)
      case 'whatsapp':
        return await this.#whatsapp(company, tenantID, ticket, crm, message)
      default:
        console.log('MESSAGE DEFAULT ===>>', message.type)
        return true
      }
    } catch (err) {
      console.log('🚀 ~ MessageController ~ sendMessage ~ err:', err)
    }
  }

  async #waba(company, tenantID, ticket, crm, message) {
    let phones
    let results = []
    let variables = {}

    try {
      const { template, table, column, id_crm } = crm
      const contactField = this.#getVariable(message.phone)

      if (contactField.type == 'crm') {
        phones = await crmController.getContact(company, tenantID, contactField.data[1], table, column, id_crm, 2)
      }

      if (phones === false) return false

      if (phones.length <= 0) {
        console.log('Tratar erro de contato não encontrado')
        return true
      }


      if (message.variables) {
        const keysVariables = Object.keys(message.variables)

        for (const keyVariable of keysVariables) {
          const resultGetVariable = this.#getVariable(message.variables[keyVariable])

          if (resultGetVariable.type == 'crm') {
            const resultGetCRM = await crmController.getDataCRM(company, tenantID, table, column, id_crm, resultGetVariable.data[1], resultGetVariable.data[2])
            variables[keyVariable] = resultGetCRM
          } else {
            let variableValue = ticket
            for (const key of resultGetVariable.data) {
              if (key == 'created_at' || key == 'updated_at') {
                variableValue = moment(new Date(variableValue[key])).format('DD/MM/YYYY HH:mm:ss')
              } else {
                variableValue = variableValue[key]
              }

              if (variableValue === undefined) return false
            }

            variables[keyVariable] = variableValue
          }
        }
      }

      for (const phone of phones) {
        const result = await coreService.waba(company, ticket.id, phone, message.hsm_id, variables)
        if (!result) return false
        results.push(result)
      }

      console.log('Envio Waba', {
        event: 'result',
        data: {
          type: 'default',
          ticket_id: ticket.id,
          error: false,
          data: JSON.stringify(results)
        }
      })

      return true
    } catch (err) {
      console.log('🚀 ~ MessageController ~ #waba ~ err:', err)
    }
  }

  async #sms(company, tenantID, ticket, crm, message) {
    let phones
    let results = []

    try {
      const { table, column, id_crm } = crm

      const contactField = this.#getVariable(message.phone)

      if (contactField.type == 'crm') {
        phones = await crmController.getContact(company, tenantID, contactField.data[1], table, column, id_crm, 3)
      }

      if (phones === false) return false

      if (phones.length <= 0) {
        console.log('Tratar erro de contato não encontrado')
        return true
      }

      const text = message.message
      const messageFormatted = await this.#formatMessage(table, column, id_crm, company, text, ticket, tenantID)

      for (const phone of phones) {
        const result = await coreService.sms(company, ticket.id, messageFormatted, phone)
        if (!result) return false
        results.push(result)
      }

      console.log('Envio SMS', {
        event: 'result',
        data: {
          type: 'default',
          id_ticket: ticket.id,
          error: false,
          data: JSON.stringify(results)
        }
      })

      return true
    } catch (err) {
      console.log('🚀 ~ MessageController ~ #sms ~ err:', err)
    }
  }

  async #whatsapp(company, tenantID, ticket, crm, message) {
    let phones
    let results = []

    try {
      const { table, column, id_crm } = crm

      const contactField = this.#getVariable(message.phone)

      if (contactField.type == 'crm') {
        phones = await crmController.getContact(company, tenantID, contactField.data[1], table, column, id_crm, 3)
      }

      if (phones === false) return false

      if (phones.length <= 0) {
        console.log('Tratar erro de contato não encontrado')
        return true
      }

      const text = message.message
      const messageFormatted = await this.#formatMessage(table, column, id_crm, company, text, ticket, tenantID)

      for (const phone of phones) {
        const result = await coreService.whatsapp(company, ticket.id, messageFormatted, phone)
        if (!result) return false
        results.push(result)
      }

      console.log('Envio Whatsapp NO ', {
        event: 'result',
        data: {
          type: 'default',
          id_ticket: ticket.id,
          error: false,
          data: JSON.stringify(results)
        }
      })

      return true
    } catch (err) {
      console.log('🚀 ~ MessageController ~ #whatsapp ~ err:', err)
    }
  }

  #getVariable(variable) {
    try {
      const regex = new RegExp('{{(.*?)}}')
      const info = regex.exec(variable)

      if (!info) return {
        type: 'string',
        data: variable
      }

      const data = info[1].split('.')
      return {
        type: data[0], data
      }
    } catch (err) {
      console.log('🚀 ~ file: InteractionController.js:78 ~ InteractionController ~ #getVariable ~ err:', err)
    }
  }

  async #formatMessage(table, column, id_crm, company, message, ticketVariables, tenantID) {
    try {
      let newMessage = message
      const variables = message.match(/\{\{([^}]+)\}\}/g)

      if (!variables) return message

      const objVariables = await Promise.all(variables.map(async variable => {
        const obj = {}

        obj.variable = variable
        obj.key = this.#getVariable(variable)

        if (obj.key.type == 'crm') {
          const resultGetCRM = await crmController.getDataCRM(company, tenantID, table, column, id_crm, obj.key.data[1], obj.key.data[2])

          if (resultGetCRM) obj.value = resultGetCRM
        } else {
          let variableValue = ticketVariables
          for (const key of obj.key.data) {
            if (key == 'created_at' || key == 'updated_at') {
              variableValue = moment(new Date(variableValue[key])).format('DD/MM/YYYY HH:mm:ss')
            } else {
              variableValue = variableValue[key]
            }

            if (variableValue === undefined) return false
          }

          obj.value = variableValue
        }

        return obj
      }))

      for (const objVariable of objVariables) {
        newMessage = newMessage.replaceAll(objVariable.variable, objVariable.value)
      }

      return newMessage
    } catch (err) {
      console.log('🚀 ~ file: InteractionController.js:69 ~ InteractionController ~ #formatMessage ~ err:', err)

    }
  }
}
