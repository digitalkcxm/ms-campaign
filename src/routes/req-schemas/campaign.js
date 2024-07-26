const create = (() => {
  return {
    name: {
      isLength: {
        errorMessage: 'O valor name é obrigatório.',
        options: {
          min: 1,
          max: 255
        }
      }
    },
    create_by: {
      isLength: {
        errorMessage: 'O valor create_by é obrigatório.',
        options: {
          min: 1,
          max: 255
        }
      }
    },
    id_workflow: {
      isLength: {
        errorMessage: 'O valor id_workflow é obrigatório.',
        options: {
          min: 1,
          max: 255
        }
      }
    },
    draft: {
      custom: {
        options: (value, { req }) => {
          if (value && typeof req.body.draft != 'boolean') {
            throw new Error('O campo "draft" deve ser do tipo boolean.')
          }
          return true
        },
      },
    },
    repeat: {
      custom: {
        options: (value, { req }) => {
          if (value && typeof req.body.repeat != 'boolean') {
            throw new Error('O campo "repeat" deve ser do tipo boolean.')
          }
          return true
        },
      },
    },
    'filter': {
      custom: {
        options: (value, { req }) => {
          if (req.body.filter.length <= 0) return true

          for (const filter of req.body.filter) {
            if(filter.rules.length <= 0) continue

            if(filter.operator) {
              const resultOperator = ['or', 'and'].filter(operator => { if(operator == filter.operator.toLowerCase()) return operator })
              if(resultOperator.length <= 0) throw new Error('O valor informado é invalido, os valores validos são: or, and.')
            }

            for (const rule of filter.rules) {
              if (!rule.value || rule.value.length <= 0) throw new Error('value é obrigatório.')
              if (!rule.variable || rule.variable.length <= 0) throw new Error('variable é obrigatório.')
              if (!rule.operator || rule.operator.length <= 0) throw new Error('operator é obrigatório.')
              const conditionOperators = ['DIFFERENT', 'EQUAL', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN'].filter(operator => { if(operator.toLowerCase() == rule.operator.toLowerCase()) return operator})
              if(conditionOperators.length <= 0) throw new Error('O valor informado é invalido, os valores validos são: DIFFERENT, EQUAL, GREATER_THAN, LESS_THAN.')
            }
          }

          return true
        },
      }
    }
  }
})()

const update = (() => {
  return {}
})()

export { create, update }
