import axios from 'axios'
import AppVariables from '../config/appVariables.js'

export default class CRMManagerService {
  static async query(company, tenantID, filter) {
    try {
      const data = {}

      if (filter[0].operator) data.operator = filter[0].operator
      if (filter[0].rules && filter[0].rules.length > 0) {
        data.rules = filter[0].rules.map(rule => {
          const obj = {}
          const searchInfo = rule.variable.split('.')
          const operators = {
            IN: 'IN',
            NOT_IN: 'NOT IN',
            DIFFERENT: '!=',
            EQUAL: '=',
            GREATER_THAN: '>',
            LESS_THAN: '<'
          }

          obj.value = String(rule.value)
          obj.operator = operators[rule.operator.toUpperCase()]
          obj.table = searchInfo[1]
          obj.column = searchInfo[2]

          return obj
        })
      } else {
        data.rules = []
      }

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/templates/data_filter/query/formatted`,
        headers: {
          token: company,
          'x-tenant-id': tenantID,
          'Content-Type': 'application/json'
        },
        data
      })

      return result.data
    } catch (err) {
      return {
        error: true,
        status: err.response.status,
        data: err.response.data
      }
    }
  }

  static async getPrincipalTemplateByCustomer(company, tenantID) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/templates/scope/customer/principal`,
        headers: {
          token: company,
          'x-tenant-id': tenantID
        }
      })

      return result.data
    } catch (err) {
      return {
        error: true,
        status: err.response.status,
        data: err.response.data
      }
    }
  }
}
