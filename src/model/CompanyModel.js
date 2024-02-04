import ErrorHelper from '../helper/ErrorHelper.js'

export default class CompanyModel {
  constructor(database = {}) {
    this.database = database
  }

  async getByToken(token) {
    try {
      const result = await this.database('company').where({ token })

      if (result.length <= 0) {
        const resultCreate = await this.create(token)
        return resultCreate
      }

      return result
    } catch (err) {
      throw new ErrorHelper('CompanyModel', 'DBError', 'An error occurred when trying to get company by token.', { token }, err)
    }
  }

  async create(token) {
    try {
      return await this.database('company').returning(['id', 'token']).insert({ token })
    } catch (err) {
      throw new ErrorHelper('CompanyModel', 'DBError', 'An error occurred when trying to create company.', {token }, err)
    }
  }
}

