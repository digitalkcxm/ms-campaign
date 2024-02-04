exports.up = knex => knex.schema.createTable('campaign', table => {
  table.uuid('id').unique().notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'))
  table.uuid('id_company').notNullable()
  table.uuid('id_workflow').notNullable()
  table.integer('id_status').unsigned().defaultTo(2)
  table.uuid('id_tenant').notNullable()

  table.string('name', 60).notNullable()
  table.integer('created_by').unsigned().notNullable()
  table.integer('edited_by').unsigned()
  table.integer('canceled_by').unsigned()
  table.boolean('draft').defaultTo(false)
  table.boolean('active').defaultTo(true)
  table.timestamps(true, true)

  table.foreign('id_company').references('company.id')
  table.foreign('id_workflow').references('workflow.id')
  table.foreign('id_status').references('status.id')
})

exports.down = knex => knex.schema.dropTableIfExists('campaign')
