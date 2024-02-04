exports.up = (knex) => knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').then(() => knex.schema.createTable('company', (table) => {
  table.uuid('id').unique().notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'))
  table.string('token', 60).notNullable().unique()
}))

exports.down = knex => knex.schema.dropTableIfExists('company')
