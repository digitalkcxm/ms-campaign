import axios from 'axios'
import AppVariables from '../config/appVariables.js'
import { serviceError, success } from '../helper/patterns/ReturnPatters.js'

export default class CRMManagerServiceV2 {
  constructor(authToken, tenantID) {
    this.Template = new Template(authToken, tenantID)
    this.DataFilter = new DataFilter(authToken, tenantID)
  }
}

class DataFilter {
  constructor(authToken, tenantID) {
    this.authToken = authToken
    this.tenantID = tenantID
    this.instance = createInstance(authToken, tenantID)
  }

  async getLeadsByFilter(filter) {
    try {
      const payload = {}

      if (filter[0].operator) payload.operator = filter[0].operator
      if (filter[0].rules && filter[0].rules.length > 0) {
        payload.rules = filter[0].rules.map(rule => {
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

          obj.value = typeof rule.value != 'object' ? String(rule.value) : JSON.stringify(rule.value)
          obj.operator = operators[rule.operator.toUpperCase()]
          obj.table = searchInfo[1]
          obj.column = searchInfo[2]

          return obj
        })
      } else {
        payload.rules = []
      }

      const result = await this.instance.post('/api/v1/templates/data_filter/query/formatted', payload)
      return success({ code: result.status, data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }

  async filterFromTable(
    table = 'cliente',
    columnsResult,
    whereClause = [],
    cursor = 0,
    size = 10000
  ) {
    try {

      const result = await this.instance
        .post('/api/v1/data/filter', {
          table,
          columnsResult,
          whereClause,
          page: {
            cursor: cursor,
            limit: size,
            next: true
          },
        })

      return success({ code: result.status, data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }

}

class Template {
  constructor(authToken, tenantID) {
    this.authToken = authToken
    this.tenantID = tenantID
    this.instance = createInstance(authToken, tenantID)
  }

  async GetAll() {
    try {
      const result = await this.instance.get('api/v1/templates/')
      return success({ code: result.status, data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }

  async GetByID(template_id) {
    try {
      const result = await this.instance.get(`api/v1/templates/${template_id}`)
      return success({ code: result.status, data: result.data })
    } catch (err) {
      return serviceError(err)
    }
  }
}


function createInstance(token, x_tenand_id, maxBodyLength = Infinity) {
  return axios.create({
    baseURL: AppVariables.MSCRMManager(),
    headers: {
      'token': token,
      'x-tenant-id': x_tenand_id,
      'Content-type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8'
    },
    maxBodyLength
  })
}
