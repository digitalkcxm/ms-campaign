import ErrorHelper from '../helper/ErrorHelper.js'
import CompanyModel from '../model/CompanyModel.js'
import CompanyService from '../service/CompanyService.js'

const companyService = new CompanyService()

async function companyVerify(req, res, database, logger, next) {
  const obj = {}

  try {
    if (!req.headers.authorization) return res.status(400).json({ error: 'Authorization is required.' })

    const companyModel = new CompanyModel(database, logger)

    const result = await companyService.getBytoken(req.headers.authorization)

    if (!result.activated) return res.status(401).json({ error: 'No authorization to perform this action.' })

    const getCompany = await companyModel.getByToken(result.token)

    obj.id = getCompany[0].id
    obj.token = result.token
    obj.url_api = result.url_api
    obj.activated = result.activated

    req.company = obj

    return next()
  } catch (err) {
    throw new ErrorHelper('company.js', 'companyVerify', 'An error occurred while checking company.', { 'req.headers': req.headers }, err)
  }
}

async function validCompany(token) {
  try {
    const result = await companyService.getBytoken(token)
    if (!result.activated) return { error: 'No authorization to perform this action.' }

  } catch (err) {
    throw new ErrorHelper('company.js', 'validCompany', 'An error occurred while validating company.', { token }, err)
  }
}

export { companyVerify, validCompany }
