exports.up = (knex) => knex.schema.createTable('workflow', (table) => {
  table.uuid('id').unique().notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'))
  table.uuid('id_company').notNullable()
  table.uuid('id_workflow').notNullable().unique()

  table.foreign('id_company').references('company.id')
})

exports.down = knex => knex.schema.dropTableIfExists('workflow')
