exports.up = knex => knex.schema.createTable('campaign_version', table => {
  table.uuid('id').unique().notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'))
  table.uuid('id_company').notNullable()
  table.uuid('id_workflow').notNullable()
  table.uuid('id_campaign').notNullable()
  table.integer('id_status').unsigned().defaultTo(2)

  table.integer('created_by').unsigned().notNullable()
  table.integer('canceled_by').unsigned()
  table.boolean('draft').defaultTo(false)
  table.boolean('repeat').defaultTo(false)
  table.timestamp('start_date')
  table.jsonb('repetition_rule').defaultTo('[]')
  table.jsonb('filter').defaultTo('[]')
  table.jsonb('negotiation').defaultTo('[]')
  table.boolean('active').defaultTo(true)
  table.timestamps(true, true)

  table.foreign('id_company').references('company.id')
  table.foreign('id_workflow').references('workflow.id')
  table.foreign('id_campaign').references('campaign.id')
  table.foreign('id_status').references('status.id')
})

exports.down = knex => knex.schema.dropTableIfExists('campaign_version')
