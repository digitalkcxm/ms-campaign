export default class IActionHandler {
  constructor(actionName = 'unknown') {
    this.actionName = actionName
  }

  async handleAction() {
    throw new Error(`[${this.actionName}.handleAction] Method not implemented`)
  }
}