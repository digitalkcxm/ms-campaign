import moment from "moment"

import CRMController from "./CRMController.js"
import RabbitMQService from "../service/RabbitMQService.js"
import { BrokerWhatsappNameEnum, ChannelNameEnum, BrokerWhatsappEnumIDs, ChannelEnumIDs } from "../model/Enumerations.js"

const crmController = new CRMController()

export default class MessageController {
  async sendMessage(data) {
    try {
      const phones = await this.#getPhones(data)
      let variables = {}

      if (
        ChannelEnumIDs[data.channel.id] === ChannelNameEnum.Whatsapp &&
        BrokerWhatsappEnumIDs[data.channel.broker_id] == BrokerWhatsappNameEnum.Gupshup
      ) {
        variables = await this.#getVariables(data)

      } else {
        const { company, crm, ticket, tenantID, message } = data
        const messageFormatted = await this.#formatMessage(
          crm.table,
          crm.column,
          crm.id_crm,
          company.token,
          message.message,
          ticket,
          tenantID
        )
        data.message.message = messageFormatted
      }
      
      const queueMessages = this.#createPhonesMsgPayload(data, phones, variables)
      this.#sendToCampaignQueue(data.company, queueMessages)
      
      return true
    } catch (err) {
      console.error('[MessageController | sendMessage] Erro ao enviar mensagem: ', err)
      return false
    }
  }

  #createPhonesMsgPayload(data, phones, variables) {
    if (!phones || phones.length == 0) return []

    const { ticket, channel, message, hsm, subject } = data
    return phones.map((phone) => {
      return {
        ticket: ticket,
        channel_id: channel.id,
        channel_token: channel.token,
        broker_id: channel.broker_id,
        contact: phone,
        message: message.message,
        subject: subject || '',
        hsm: {
          ...hsm,
          variables: variables || hsm?.variables
        }
      }
    })
  }

  async #getPhones(data) {
    try {
      const contactField = this.#getVariable(data.message.phone)
      let phones

      if (contactField.type == "crm" && !data.contato) {
        const { template, table, column, id_crm } = data.crm
        phones = await crmController.getContact(
          data.company.token,
          data.tenantID,
          contactField.data[1],
          table,
          column,
          id_crm,
          data.channel.id
        )
      } else {
        phones = [data.contato]
      }
      if (!phones || phones.length == 0)
        throw new Error("Nenhum telefone encontrado")
      return phones
    } catch (err) {
      throw err
    }
  }

  async #getVariables(data) {
    let variables = {}

    const { hsm, ticket, company, tenantID } = data
    const { table, column, id_crm } = data.crm

    if (hsm?.variable) {
      const keysVariables = Object.keys(hsm.variable)

      for (const keyVariable of keysVariables) {
        const resultGetVariable = this.#getVariableType(hsm.variable[keyVariable])

        if (resultGetVariable.type == "crm") {
          const resultGetCRM = await crmController.getDataCRM(
            company.token,
            tenantID,
            table,
            column,
            id_crm,
            resultGetVariable.data[1],
            resultGetVariable.data[2]
          )
          variables[keyVariable] = resultGetCRM
        } else {
          let variableValue = ticket
          for (const key of resultGetVariable.data) {
            if (key == "created_at" || key == "updated_at") {
              variableValue = moment(new Date(variableValue[key])).format(
                "DD/MM/YYYY HH:mm:ss"
              )
            } else {
              variableValue = variableValue[key]
            }

            if (variableValue === undefined) return false
          }

          variables[keyVariable] = variableValue
        }
      }
    }

    return variables
  }

  async #sendToCampaignQueue(company, messages) {
    const queue_name = `campaign:send_messages:${company.name}`
    for (const message of messages) {
      await RabbitMQService.sendToQueue(queue_name, message)
    }
  }

  // async sendMessage(company, tenantID, ticket, crm, message, contato) {
  //   try {
  //     switch (message.type) {
  //     case 'waba':
  //       return await this.#waba(company, tenantID, ticket, crm, message, contato)
  //     case 'sms':
  //       return await this.#sms(company, tenantID, ticket, crm, message, contato)
  //     case 'whatsapp':
  //       return await this.#whatsapp(company, tenantID, ticket, crm, message, contato)
  //     default:
  //       console.log('MESSAGE DEFAULT ===>>', message.type)
  //       return true
  //     }
  //   } catch (err) {
  //     console.log('🚀 ~ MessageController ~ sendMessage ~ err:', err)
  //   }
  // }

  // async #waba(company, tenantID, ticket, crm, message, contato) {
  //   let phones
  //   let results = []
  //   let variables = {}

  //   try {
  //     const { template, table, column, id_crm } = crm
  //     const contactField = this.#getVariable(message.phone)

  //     if (contactField.type == "crm" && !contato) {
  //       phones = await crmController.getContact(
  //         company,
  //         tenantID,
  //         contactField.data[1],
  //         table,
  //         column,
  //         id_crm,
  //         2
  //       )
  //     } else {
  //       phones = [contato]
  //     }

  //     if (phones === false) return false

  //     if (phones.length <= 0) {
  //       console.log("Tratar erro de contato não encontrado")
  //       return true
  //     }

  //     if (message.variables) {
  //       const keysVariables = Object.keys(message.variables)

  //       for (const keyVariable of keysVariables) {
  //         const resultGetVariable = this.#getVariable(
  //           message.variables[keyVariable]
  //         )

  //         if (resultGetVariable.type == "crm") {
  //           const resultGetCRM = await crmController.getDataCRM(
  //             company,
  //             tenantID,
  //             table,
  //             column,
  //             id_crm,
  //             resultGetVariable.data[1],
  //             resultGetVariable.data[2]
  //           )
  //           variables[keyVariable] = resultGetCRM
  //         } else {
  //           let variableValue = ticket
  //           for (const key of resultGetVariable.data) {
  //             if (key == "created_at" || key == "updated_at") {
  //               variableValue = moment(new Date(variableValue[key])).format(
  //                 "DD/MM/YYYY HH:mm:ss"
  //               )
  //             } else {
  //               variableValue = variableValue[key]
  //             }

  //             if (variableValue === undefined) return false
  //           }

  //           variables[keyVariable] = variableValue
  //         }
  //       }
  //     }

  //     for (const phone of phones) {
  //       const result = await coreService.waba(
  //         company,
  //         ticket.id,
  //         phone,
  //         message.hsm_id,
  //         variables
  //       )
  //       if (!result) return false
  //       results.push(result)
  //     }

  //     console.log("Envio Waba", {
  //       event: "result",
  //       data: {
  //         type: "default",
  //         ticket_id: ticket.id,
  //         error: false,
  //         data: JSON.stringify(results),
  //       },
  //     })

  //     return true
  //   } catch (err) {
  //     console.log("🚀 ~ MessageController ~ #waba ~ err:", err)
  //   }
  // }

  // async #sms(company, tenantID, ticket, crm, message, contato) {
  //   let phones
  //   let results = []

  //   try {
  //     const { table, column, id_crm } = crm

  //     const contactField = this.#getVariable(message.phone)

  //     if (contactField.type == "crm" && !contato) {
  //       phones = await crmController.getContact(
  //         company,
  //         tenantID,
  //         contactField.data[1],
  //         table,
  //         column,
  //         id_crm,
  //         3
  //       )
  //     } else {
  //       phones = [contato]
  //     }

  //     if (phones === false) return false

  //     if (phones.length <= 0) {
  //       console.log("Tratar erro de contato não encontrado")
  //       return true
  //     }

  //     const text = message.message
  //     const messageFormatted = await this.#formatMessage(
  //       table,
  //       column,
  //       id_crm,
  //       company,
  //       text,
  //       ticket,
  //       tenantID
  //     )

  //     for (const phone of phones) {
  //       const result = await coreService.sms(
  //         company,
  //         ticket.id,
  //         messageFormatted,
  //         phone
  //       )
  //       if (!result) return false
  //       results.push(result)
  //     }

  //     console.log("Envio SMS", {
  //       event: "result",
  //       data: {
  //         type: "default",
  //         id_ticket: ticket.id,
  //         error: false,
  //         data: JSON.stringify(results),
  //       },
  //     })

  //     return true
  //   } catch (err) {
  //     console.log("🚀 ~ MessageController ~ #sms ~ err:", err)
  //   }
  // }

  // async #whatsapp(company, tenantID, ticket, crm, message, contato) {
  //   let phones
  //   let results = []

  //   try {
  //     const { table, column, id_crm } = crm

  //     const contactField = this.#getVariable(message.phone)

  //     if (contactField.type == "crm" && !contato) {
  //       phones = await crmController.getContact(
  //         company,
  //         tenantID,
  //         contactField.data[1],
  //         table,
  //         column,
  //         id_crm,
  //         3
  //       )
  //     } else {
  //       phones = [contato]
  //     }

  //     if (phones === false) return false

  //     if (phones.length <= 0) {
  //       console.log("Tratar erro de contato não encontrado")
  //       return true
  //     }

  //     const text = message.message
  //     const messageFormatted = await this.#formatMessage(
  //       table,
  //       column,
  //       id_crm,
  //       company,
  //       text,
  //       ticket,
  //       tenantID
  //     )

  //     for (const phone of phones) {
  //       const result = await coreService.whatsapp(
  //         company,
  //         ticket.id,
  //         messageFormatted,
  //         phone
  //       )
  //       if (!result) return false
  //       results.push(result)
  //     }

  //     console.log("Envio Whatsapp NO ", {
  //       event: "result",
  //       data: {
  //         type: "default",
  //         id_ticket: ticket.id,
  //         error: false,
  //         data: JSON.stringify(results),
  //       },
  //     })

  //     return true
  //   } catch (err) {
  //     console.log("🚀 ~ MessageController ~ #whatsapp ~ err:", err)
  //   }
  // }

  #getVariable(variable) {
    try {
      const regex = new RegExp("{{(.*?)}}")
      const info = regex.exec(variable)

      if (!info)
        return {
          type: "string",
          data: variable,
        }

      const data = info[1].split(".")
      return {
        type: data[0],
        data,
      }
    } catch (err) {
      console.error('[MessageController | #getVariable] ', err)
    }
  }

  #getVariableType(variable) {
    try {
      const data = variable.split(".")
      return {
        type: data[0],
        data,
      }
      
    } catch (err) {
      console.error('[MessageController | #getVariableType] ', err)
    }
  }

  async #formatMessage(
    table,
    column,
    id_crm,
    company_token,
    message,
    ticketVariables,
    tenantID
  ) {
    try {
      let newMessage = message
      const variables = message.match(/\{\{([^}]+)\}\}/g)

      if (!variables) return message

      const objVariables = await Promise.all(
        variables.map(async (variable) => {
          const obj = {}

          obj.variable = variable
          obj.key = this.#getVariable(variable)

          if (obj.key.type == "crm") {
            const resultGetCRM = await crmController.getDataCRM(
              company_token,
              tenantID,
              table,
              column,
              id_crm,
              obj.key.data[1],
              obj.key.data[2]
            )

            if (resultGetCRM) obj.value = resultGetCRM
          } else {
            let variableValue = ticketVariables
            for (const key of obj.key.data) {
              if (key == "created_at" || key == "updated_at") {
                variableValue = moment(new Date(variableValue[key])).format(
                  "DD/MM/YYYY HH:mm:ss"
                )
              } else {
                variableValue = variableValue[key]
              }

              if (variableValue === undefined) return false
            }

            obj.value = variableValue
          }

          return obj
        })
      )

      for (const objVariable of objVariables) {
        newMessage = newMessage.replaceAll(
          objVariable.variable,
          objVariable.value
        )
      }

      return newMessage
    } catch (err) {
      console.log(
        "🚀 ~ file: InteractionController.js:69 ~ InteractionController ~ #formatMessage ~ err:",
        err
      )
    }
  }
}
