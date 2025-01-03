import axios from 'axios'
import AppVariables from '../config/appVariables.js'

export default class CRMManagerService {
  static async getLeadsByFilter(company, tenantID, filter) {
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

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/templates/data_filter/query/formatted`,
        headers: {
          token: company,
          'x-tenant-id': tenantID,
          'Content-Type': 'application/json'
        },
        data: payload
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

  static async getPrincipalTemplateByBusiness(company, tenantID) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/templates/scope/business/principal`,
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

  static async getAllTables(company, tenantID) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/tables/`,
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

  static async getTemplateByID(company, tenantID, templateID) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/templates/${templateID}`,
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

  static async createSingleJSON(token, tenant_id, data) {
    try {
      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${AppVariables.MSCRMManager()}/api/v1/data_import/single/json`,
        headers: {
          token,
          'x-tenant-id': tenant_id,
          'Content-Type': 'application/json'
        },
        data
      })

      return result.data
    } catch (err) {
      console.log('Erro ao criar negociação.', {
        error: true,
        status: err.response.status,
        data: err.response.data
      })

      return {
        error: true,
        status: err.response.status,
        data: err.response.data
      }
    }
  }

  static async getDataCRM(token, tenant_id, get_table, table, column, id_crm) {
    try {
      const result = await axios.request({
        method: 'get',
        maxBodyLength: Infinity,
        url: `${process.env.MSCRMMANAGER}/api/v1/data/scope/business/${get_table}?table=${table}&${column}=${id_crm}&page=0&size=50`,
        headers: {
          token,
          'x-tenant-id': tenant_id
        }
      })

      if(result.data.data.length <= 0) return false

      return result.data.data
    } catch (err) {
      return {
        error: true,
        status: err.response.status,
        data: err.response.data
      }
    }
  }
}
