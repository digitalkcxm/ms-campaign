import CRMManagerService from '../service/CRMManagerService.js'
import S3 from '../config/S3.js'
import { URL } from 'url'
import { sucess } from './patterns/ReturnPatters.js'
import { error } from 'console'

export default async function GetLeads(campaignInfo, company) {
  const isMailing = !!campaignInfo.file_url

  if (isMailing) {
    return await GetLeadByMailing(campaignInfo)
  }

  return await GetLeadByCRM(company.token, campaignInfo.id_tenant, campaignInfo.filter)
}

async function GetLeadByMailing(campaignInfo) {
  const url = new URL(campaignInfo.file_url)
  const path = url.pathname

  const S3Service = new S3()
  const contentFile = await S3Service.downloadFile(path.slice(1))

  let leads = []
  if (contentFile) {
    if (contentFile.length <= 1) return leads

    const headers = contentFile[0].split(';')

    const type = (['Número', 'Numero'].includes(headers[1])) ? contactType.phone_number : contactType.email

    for (let i = 1; i < contentFile.length; i++) {
      const lineContent = contentFile[i].split(';')

      if (lineContent.length > 1) {
        let [name, contact] = lineContent
        contact = (type === contactType.phone_number) ? contact.replace(/\D/g, '') : contact
        leads.push({
          nome: name,
          contato: contact
        })
      }
    }
  }

  return sucess({
    data: {
      isMaiging: true,
      result: leads
    }
  })
}

async function GetLeadByCRM(authToken, tenantID, filter) {
  try {
    const result = await CRMManagerService.getLeadsByFilter(authToken, tenantID, filter)
    return sucess({
      data: {
        isMaiging: false,
        result: result
      }
    })
  } catch (err) {
    return error({
      error: err,
      message: 'An error occurred when trying to get leads by filter.'
    })
  }
}

const contactType = {
  phone_number: 'phone_number',
  email: 'email'
}
