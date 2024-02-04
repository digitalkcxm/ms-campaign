import axios from 'axios'

export default class CompanyService {
  async getBytoken(token) {
    try {
      const result = await axios({
        method: 'get',
        url: `${process.env.MSCOMPANY}/api/v1/company/token/${token}`
      })

      return result.data
    } catch (err) {
      return err.response.data
    }
  }
}
