import axios from 'axios'

export default class CompanyService {

  constructor(redis = null) {
    this.redis = redis
  }

  async getBytoken(token) {
    try {
      const hasRedis = !!this.redis
      const redisCompanyKey = `company:${token}`
      if (hasRedis) {
        const result = await this.redis.get(redisCompanyKey)
        if (result) return JSON.parse(result)
      }

      const result = await axios({
        method: 'get',
        url: `${process.env.MSCOMPANY}/api/v1/company/token/${token}`
      })

      if (hasRedis)
        await this.redis.set(redisCompanyKey, JSON.stringify(result.data), 'EX', 60 * 60 * 1)

      return result.data
    } catch (err) {
      return err.response.data
    }
  }
}
