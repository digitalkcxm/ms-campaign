import knex from 'knex'

let WORKFLOW_CONNECTION = null

export default class WorkflowDatabase {

  static GetConnection() {
    if (WORKFLOW_CONNECTION) {
      return WORKFLOW_CONNECTION
    }

    const dbName = process.env.DB_WORKFLOW_DATABASE
    const host = process.env.DB_WORKFLOW_HOST
    const user = process.env.DB_WORKFLOW_USER
    const password = process.env.DB_WORKFLOW_PASSWORD

    const KnexCredentials = this.#KnexCredentials(host, dbName, user, password)
    const connection = knex(KnexCredentials)

    WORKFLOW_CONNECTION = connection

    return connection
  }

  static CloseConnection() {
    WORKFLOW_CONNECTION.destroy()
    WORKFLOW_CONNECTION = null
  }

  static #KnexCredentials(host, database, user, password) {
    return {
      client: 'postgresql',
      connection: {
        host,
        database,
        user,
        password,
      },
      pool: {
        min: 0,
        max: 3,
        afterCreate: function (connection, callback) {
          connection.query('SET timezone = -3;', function (err) {
            callback(err, connection)
          })
        },
      },
    }
  }
}