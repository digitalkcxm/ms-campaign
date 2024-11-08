export const status = {
  draft: 1,
  scheduled: 2,
  running: 3,
  canceled: 4,
  error: 5,
  finished: 6,
}

export const statusByID = {
  1: 'draft',
  2: 'scheduled',
  3: 'running',
  4: 'canceled',
  5: 'error',
  6: 'finished',
}

export const channel = {
  chat: 1,
  whatsapp: 2,
  waba: 2,
  sms: 3,
  email: 4,
  phone: 6,
}

export const ChannelNameEnum = {
  Email: 'Email',
  Whatsapp: 'Whatsapp',
  SMS: 'SMS',
  Phone: 'Phone',
  Chat: 'Chat',
}

export const ChannelEnumIDs = {
  1: ChannelNameEnum.Chat,
  2: ChannelNameEnum.Whatsapp,
  3: ChannelNameEnum.SMS,
  4: ChannelNameEnum.Email,
  6: ChannelNameEnum.Phone,
}

export const BrokerWhatsappNameEnum = {
  Digitalk: 'Digitalk',
  Vonage: 'Vonage',
  Gupshup: 'Gupshup',
  MShubwsapp: 'MShubwsapp',
  BeeApp: 'BeeApp',
}


export const MapIDs_BrokerNameEnum = {
  1: BrokerWhatsappNameEnum.Digitalk,
  2: BrokerWhatsappNameEnum.Vonage,
  3: BrokerWhatsappNameEnum.Gupshup,
  4: BrokerWhatsappNameEnum.MShubwsapp,
  5: BrokerWhatsappNameEnum.BeeApp,
}

export const ActionTypeEnum = {
  CreateLead: 'CreateLeadAction',
  SendMessage: 'SendMessageAction',  
  PreProcessCampaign: 'PreProcessCampaignAction',  
  UpdateStatusCampaign: 'UpdateStatusCampaignAction',
}