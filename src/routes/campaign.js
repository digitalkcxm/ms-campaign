import express from 'express'
import { checkSchema } from 'express-validator'

import { HTTPError } from '../middlewares/HTTPError.js'
import { validation } from '../helper/UUIDValidation.js'
import { companyVerify } from '../middlewares/company.js'
import { create, update } from '../routes/req-schemas/campaign.js'
import { applyRules } from '../middlewares/validate-request.js'
import CampaignController from '../controller/CampaignController.js'

export default (database, logger, redis) => {
  const router = express.Router()

  router.use((req, res, next) => companyVerify(req, res, database, logger, next))

  const campaignController = new CampaignController(database, logger, redis)

  router.get('/', async (req, res, next) => {
    try {
      let { search, status, size, page } = req.query
      if(status) status = JSON.parse(status)

      const result = await campaignController.getAll(req.company, search, status, size, page)

      return res.status(200).json(result)
    } catch (err) {
      next(new Error(err))
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const resultValidationUUID = validation(req.params.id)
      if (!resultValidationUUID) return res.status(400).json({ error: 'ID informed is invalid.' })

      const result = await campaignController.getByID(req.company, req.params.id)

      delete result.id_tenant
      delete result.campaign_version_id

      return res.status(200).json(result)
    } catch (err) {
      next(new Error(err))
    }
  })

  router.post('/', checkSchema(create), applyRules, async (req, res, next) => {
    try {
      const XTenantID = req.headers['x-tenant-id']

      const { name, create_by, id_workflow, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation, fileUrl } = req.body

      const result = await campaignController.create(req.company, XTenantID, name, create_by, id_workflow, draft, repeat, start_date, repetition_rule, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation, fileUrl)

      return res.status(201).json(result)
    } catch (err) {
      next(new Error(err))
    }
  })

  router.put('/:id', checkSchema(update), applyRules, async (req, res, next) => {
    try {
      const { name, id_workflow, repetition_rule, edited_by, start_date, draft, repeat, active, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation } = req.body

      const result = await campaignController.update(req.company, req.params.id, name, id_workflow, repetition_rule, edited_by, start_date, draft, repeat, active, filter, end_date, id_phase, ignore_open_tickets, first_message, negotiation)

      return res.status(200).json(result)
    } catch (err) {
      next(new Error(err))
    }
  })

  router.use((error, req, res, next) => HTTPError(error, req, res, next))

  return router
}
