import axios from 'axios'
import moment from 'moment'
import AppVariables from '../config/appVariables.js'

export default class WorkflowService {
  constructor(logger = {}) {
    this.logger = logger
  }

  async createTicket(Authorization, name, id_phase, origin, responsibles = []) {
    try {
      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSWorkflow()}/api/v1/ticket`,
        headers: { Authorization, 'Content-Type': 'application/json' },
        data: {
          name,
          id_user: 0,
          id_phase,
          responsibles,
          origin
        }
      })

      return result.data
    } catch (err) {
      return err.response.data
    }
  }

  async linkCustomer(Authorization, id_ticket, template, table, column, id_crm) {
    try {
      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSWorkflow()}/api/v1/customer`,
        headers: { Authorization, 'Content-Type': 'application/json' },
        data: {
          id_ticket,
          id_crm,
          table,
          column,
          template
        }
      })

      return result.data
    } catch (err) {
      return err.response.data
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
