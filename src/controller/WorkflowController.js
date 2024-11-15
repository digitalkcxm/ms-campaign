/* eslint-disable no-undef */

import ErrorHelper from '../helper/ErrorHelper.js'
import WorkflowModel from '../model/WorkflowModel.js'
import MessageController from './MessageController.js'
import CompanyService from '../service/CompanyService.js'
import WorkflowService from '../service/WorkflowService.js'
import CampaignVersionController from './CampaignVersionController.js'
import CampaignModel from '../model/CampaignModel.js'


export default class WorkflowController {
  constructor(database = {}, logger = {}) {
    this.campaignModel = new CampaignModel(database)
    this.companyService = new CompanyService()
    this.workflowModel = new WorkflowModel(database)
    this.workflowService = new WorkflowService(logger)
    this.campaignVersionController = new CampaignVersionController(database, logger)
    this.messageController = new MessageController()
  }

  async verifyWorkflowID(id_company, id_workflow) {
    try {
      const getID = await this.workflowModel.getWorkflowID(id_company, id_workflow)
      if (getID.length > 0) 
        return getID[0].id

      const result = await this.workflowModel.createWorkflowID(id_company, id_workflow)
      return result[0].id
    } catch (err) {
      throw new ErrorHelper('WorkflowController', 'getIDWorkflow', 'An error occurred when trying get workflow id.', { id_company, id_workflow }, err)
    }
  }
}
