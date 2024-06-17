import axios from 'axios'
import AppVariables from '../config/appVariables.js'
import Redis from '../config/redis.js'
import CompanyService from './CompanyService.js'

const redis = Redis.newConnection()
const companyService = new CompanyService()

export default class CoreService {
  async whatsapp(company_token, id_ticket, message, trigger, protocols = [], type = 'text') {
    try {
      const company = await companyService.getBytoken(company_token)
      const token = await this.#getToken(company.url_api, company_token)

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${company.url_api}/api/v2/ticket/send`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          protocols,
          id_ticket,
          message,
          trigger,
          id_channel: 2,
          type
        }
      })

      return { status: result.status, data: result.data }
    } catch (err) {
      if(err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') return false

      if (err.response.status == 401) {
        await redis.del(`${AppVariables.ProjectName()}:token:${company_token}`)
        return await this.whatsapp(company_token, id_ticket, message, trigger, protocols, type)
      }

      return { status: err.response.status, data: err.response.data }
    }
  }

  async waba(company_token, id_ticket, trigger, template_message_id, variables = {}, protocols = [], type = 'text') {
    try {
      const company = await companyService.getBytoken(company_token)
      const token = await this.#getToken(company.url_api, company_token)

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${company.url_api}/api/v2/ticket/send`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          protocols,
          id_ticket,
          template_message_id,
          variables: JSON.stringify(variables),
          trigger,
          id_channel: 2,
          type
        }
      })

      return { status: result.status, data: result.data }
    } catch (err) {
      if(err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') return false

      if (err.response.status == 401) {
        await redis.del(`${AppVariables.ProjectName()}:token:${company_token}`)
        return await this.waba(company_token, id_ticket, trigger, template_message_id, variables, protocols, type)
      }

      return { status: err.response.status, data: err.response.data }
    }
  }

  async sms(company_token, id_ticket, message, trigger, protocols = [], type = 'text') {
    try {
      const company = await companyService.getBytoken(company_token)
      const token = await this.#getToken(company.url_api, company_token)

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${company.url_api}/api/v2/ticket/send`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          protocols,
          id_ticket,
          message,
          trigger,
          id_channel: 3,
          type
        }
      })

      return { status: result.status, data: result.data }
    } catch (err) {
      if(err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') return false

      if (err.response.status == 401) {
        await redis.del(`${AppVariables.ProjectName()}:token:${company_token}`)
        return await this.sms(company_token, id_ticket, message, trigger, protocols, type)
      }

      return { status: err.response.status, data: err.response.data }
    }
  }

  async #getToken(url_api, company_token) {
    const key = `${AppVariables.ProjectName()}:token:${company_token}`

    try {
      const cache = await redis.get(key)

      if (cache) return cache

      const result = await axios.request({
        method: 'post',
        maxBodyLength: Infinity,
        url: `${url_api}/api/v1/authentication/login`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          'email': AppVariables.CoreEMail(),
          'password': AppVariables.CorePass()
        }
      })

      const token = result.data.token

      await redis.set(key, token)

      return token
    } catch (err) {
      console.log('🚀 ~ file: CoreService.js:39 ~ CoreService ~ #getToken ~ err:', err.response.status, err.response.data)

    }
  }
}
