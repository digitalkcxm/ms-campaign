exports.up = knex => knex.raw(`
  ALTER TABLE campaign ADD total INT DEFAULT(0);
`)

exports.down = knex => { }
