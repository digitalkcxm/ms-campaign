import util from 'util'
import logger from '../config/logger.js'
export default class ErrorHelper extends Error {
  constructor(className, name, message, params, originalError) {
    super(message)
    this.name = name
    this.params = { [className]: params }
    this.originalStack = originalError.stack
    this.originalError = {
      [className]: {
        stack: this.originalStack
      }
    }

    if (Object.keys(originalError).length > 0) {
      const obj = {}
      for (const key of Object.keys(originalError)) {
        obj[key] = originalError[key]
      }
      this.originalError[className][params] = obj
    }

    Error.captureStackTrace(this, this.constructor)

    logger.error(`
      ProjectName: ${process.env.PROJECT_NAME}
      Message: ${message}
      Name: ${this.name}
      Params: ${util.inspect(this.params, { depth: null })}
      Original Error: ${util.inspect(this.originalError, { depth: null })}
    `)
  }
}
