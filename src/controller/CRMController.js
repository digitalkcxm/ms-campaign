import CRMManagerService from '../service/CRMManagerService.js'

export default class CRMController {

  async getContact(token, tenant_id, get_table, table, column, id_crm, contactType) {
    let result
    try {
      result = await CRMManagerService.getDataCRM(token, tenant_id, get_table, table, column, id_crm)
      if(!result) return false

      const data = result.map(line => {
        const contact_channel = line.filter(column => {
          if(column.type === 'contact_channel') return column
        })

        if(contact_channel[0].value !== contactType) return ''
        const obj = {}

        for (const column of line) {
          obj[column.column] = column.value
        }

        return obj.contato
      })

      const resultData = data.filter(data => { if (data !== '') return data })
      const removeDuplicate = [...new Set(resultData)]

      return removeDuplicate
    } catch (err) {
      console.log('🚀 ~ file: CRMController.js:12 ~ CRMController ~ getContact ~ err:', err)
    }
  }

  async getDataCRM(token, tenant_id, table, column, id_crm, get_table, get_column) {
    try {
      const result = await CRMManagerService.getDataCRM(token, tenant_id, get_table, table, column, id_crm)

      if (!result) return false

      const resultFilterData = result[0].filter(data => {
        if (data.column == get_column) return data.value
      })

      if (resultFilterData.length <= 0) return false

      return resultFilterData[0].value
    } catch (err) {
      console.log('🚀 ~ file: CRMManagerService.js:6 ~ CRMManagerService ~ getDataCRM ~ err:', err)

    }
  }
}
