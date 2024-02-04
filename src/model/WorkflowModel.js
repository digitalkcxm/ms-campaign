import ErrorHelper from '../helper/ErrorHelper.js'

export default class WorkflowModel {
  constructor(database = {}) {
    this.database = database
  }

  async getWorkflowID(id_company, id_workflow) {
    try {
      return await this.database('workflow')
        .select('id')
        .where({ id_company, id_workflow })
    } catch (err) {
      throw new ErrorHelper('WorkflowModel', 'getWorkflowID', 'An error occurred when trying get workflow id.', { id_company, id_workflow }, err)
    }
  }

  async createWorkflowID(id_company, id_workflow) {
    try {
      return await this.database('workflow')
        .returning(['id'])
        .insert({ id_company, id_workflow })
    } catch (err) {
      throw new ErrorHelper('WorkflowModel', 'getWorkflowID', 'An error occurred when trying create workflow id.', { id_company, id_workflow }, err)
    }
  }
}
