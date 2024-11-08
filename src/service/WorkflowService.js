/* eslint-disable no-undef */

import axios from 'axios'
import AppVariables from '../config/appVariables.js'
import { serviceError, success } from '../helper/patterns/ReturnPatters.js'

export default class WorkflowService {
  constructor(logger = {}) {
    this.logger = logger
  }

  async createTicket(
    Authorization,
    payload = {
      name,
      id_phase,
      origin,
      responsibles
    }
  ) {
    try {

      payload.responsibles = (payload?.responsibles?.length) ? payload.responsibles : []

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSWorkflow()}/api/v1/ticket`,
        headers: { Authorization, 'Content-Type': 'application/json' },
        data: payload
      })

      return success({ data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }

  async linkCustomer(Authorization, id_ticket, linkPayload = { template, table, column, id_crm }) {
    try {
      if(!linkPayload) return success({ data: null })

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSWorkflow()}/api/v1/customer`,
        headers: { Authorization, 'Content-Type': 'application/json' },
        data: {
          id_ticket,
          ...linkPayload
        }
      })

      return success({ data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }

  async checkOpenTickets(Authorization, id_crm) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSWorkflow()}/api/v1/customer/linked_tickets?id_crm=${id_crm}`,
        headers: { Authorization }
      })

      return result.data
    } catch (err) {
      return err.response.data
    }
  }
}
