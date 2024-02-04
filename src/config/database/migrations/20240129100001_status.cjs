exports.up = knex => knex.schema.createTable('status', table => {
  table.increments()
  table.string('name', 50).notNullable()
  table.timestamps(true, true)
})

exports.down = knex => knex.schema.dropTableIfExists('status')
