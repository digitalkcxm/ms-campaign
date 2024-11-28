import S3 from '../config/S3.js'
import { URL } from 'url'
import { success } from './patterns/ReturnPatters.js'
import { error } from 'console'
import CRMManagerServiceV2 from '../service/CRMManagerServiceV2.js'

export default async function GetLeads(campaignInfo, company) {
  const isMailing = !!campaignInfo.file_url

  if (isMailing) {
    return await GetLeadByMailing(campaignInfo)
  }

  return await GetLeadByCRM(company.token, campaignInfo.id_tenant, campaignInfo.filter, campaignInfo.first_message?.[0]?.id_channel)
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

    const type = (['número', 'numero'].includes(headers[1].toLowerCase())) ? contactType.phone_number : contactType.email

    for (let i = 1; i < contentFile.length; i++) {
      const lineContent = contentFile[i].split(';')

      if (lineContent.length > 1) {
        let [name, contact] = lineContent
        contact = (type === contactType.phone_number) ? contact.replace(/\D/g, '') : contact
        leads.push({
          nome: name,
          contatos: [ contact ]
        })
      }
    }
  }

  return success({
    data: {
      isMailing: true,
      result: leads
    }
  })
}

async function GetLeadByCRM(authToken, tenantID, filter, channel_id) {
  try {
    const CRMManagerService = new CRMManagerServiceV2(authToken, tenantID)

    // Get Leads by Filter
    const result = await CRMManagerService.DataFilter.getLeadsByFilter(filter)
    if (!result?.data?.length) return success({
      data: {
        isMailing: false,
        result: []
      }
    })

    // Get Templates
    const allTemplates = await CRMManagerService.Template.GetAll()
    let contactTemplate_id = allTemplates.data.find((t) => t.template_contact_table).id
    let customerTemplate_id = allTemplates.data.find((t) => t.template_customer_table).id

    // Get Customer and Contacts
    const mapCustomerIDs = result.data.map((r) => r.id)

    const [customerInfo, allContacts] = await Promise.all([
      GetInfoFromTable(authToken, tenantID, customerTemplate_id, 'id', mapCustomerIDs),
      GetInfoFromTable(authToken, tenantID, contactTemplate_id, 'id_cliente', mapCustomerIDs)
    ])

    // Concat infos
    const leads = result.data.map((r) => {
      const customer = customerInfo.find((contact) => contact.id == r.id)
      const contacts = allContacts.filter((contact) => contact.id_cliente == r.id && contact.canal_contato == channel_id)

      return {
        id: r.id,
        nome: r.nome,
        customer: customer,
        contatos: contacts.map((c) => c.contato),
      }
    })

    return success({
      data: {
        isMailing: false,
        result: leads.filter((lead) => lead.contatos.length > 0)
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

async function GetInfoFromTable(token, x_tenand_id, template_id, serch_field, mapCustomerIDs = []) {
  const CRMManagerService = new CRMManagerServiceV2(token, x_tenand_id)
  const template = await CRMManagerService.Template.GetByID(template_id)
  
  const tableFields = template.data.fields.map((field) => field.column)
  const results = []

  let hasMoreLeads = true
  for(let cursor = 0, size = 1000; hasMoreLeads; ) { // TODO: modificar size
    const result = await CRMManagerService.DataFilter.filterFromTable(
      template.data.table_name, 
      tableFields,
      [ `${serch_field} in (${mapCustomerIDs.join(',')})` ],
      cursor,
      size
    )
    hasMoreLeads = result.data.data.length >= size
    cursor = result.data?.cursor?.end

    results.push(...result.data.data)
  }

  return results
}