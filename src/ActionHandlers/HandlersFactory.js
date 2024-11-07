import { ActionTypeEnum } from '../model/Enumerations.js'
import CreateLeadActionHandler from './handlers/CreateLeadActionHandler.js'
import ExecuteCampaignActionHandler from './handlers/ExecuteCampaignActionHandler.js'
import UpdateStatusCampaignActionHandler from './handlers/UpdateStatusCampaign.js'

export default class HandlersFactory {

  constructor(database, redis, logger) {
    this.database = database
    this.redis = redis
    this.logger = logger
  }

  create(actionType) {
    switch (actionType) {
    case ActionTypeEnum.ExecuteCampaign:
      return new ExecuteCampaignActionHandler(this.database, this.redis, this.logger)
    case ActionTypeEnum.UpdateStatusCampaign:
      return new UpdateStatusCampaignActionHandler(this.database, this.redis, this.logger)
    case ActionTypeEnum.CreateLead:
      return new CreateLeadActionHandler(this.database, this.redis, this.logger)
    default:
      return null
    }
  }
}