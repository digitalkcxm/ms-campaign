export default function GetVariablesInfo(variable = '') {
  const variablePath = variable.replace('{{', '').replace('}}', '').split('.')

  if (variablePath[0] == 'ticket') {
    return {
      type: 'ticket',
      path: variablePath.slice(1),
    }
  }

  if (variablePath[0] == 'crm') {
    return (['customer', 'business'].includes(variablePath[1])) ?
      {
        type: variablePath[1],
        path: variablePath.slice(2),
      } : {
        type: 'crm',
        path: variablePath.slice(1),
      }
  }
}