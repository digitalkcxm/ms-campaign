import ErrorHelper from '../helper/ErrorHelper.js'
import WorkflowModel from '../model/WorkflowModel.js'

export default class WorkflowController {
  constructor(database = {}) {
    this.workflowModel = new WorkflowModel(database)
  }

  async getIDWorkflow(id_company, id_workflow) {
    try {
      const getID = await this.workflowModel.getWorkflowID(id_company, id_workflow)

      if(getID.length > 0) return getID[0].id

      const result = await this.workflowModel.createWorkflowID(id_company, id_workflow)

      return result[0].id
    } catch (err) {
      throw new ErrorHelper('WorkflowController', 'getIDWorkflow', 'An error occurred when trying get workflow id.', { id_company, id_workflow }, err)
    }
  }
}
