import { ActionTypeEnum } from '../model/Enumerations.js'
import CreateLeadActionHandler from './handlers/CreateLeadActionHandler.js'
import PreProcessCampaignActionHandler from './handlers/PreProcessCampaignActionHandler.js'
import MessageSenderActionHandler from './handlers/MessageSenderActionHandler.js'
import UpdateStatusCampaignActionHandler from './handlers/UpdateStatusCampaign.js'

export default class HandlersFactory {

  static create(actionType, database, redis, logger) {
    switch (actionType) {
    case ActionTypeEnum.PreProcessCampaign:
      return new PreProcessCampaignActionHandler(database, redis, logger)
    case ActionTypeEnum.UpdateStatusCampaign:
      return new UpdateStatusCampaignActionHandler(database, redis, logger)
    case ActionTypeEnum.CreateLead:
      return new CreateLeadActionHandler(database, redis, logger)
    case ActionTypeEnum.SendMessage:
      return new MessageSenderActionHandler(database, redis, logger)
    default:
      return null
    }
  }
}