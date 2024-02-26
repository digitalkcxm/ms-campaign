exports.up = knex => knex.raw(`
  ALTER TABLE campaign_version ADD id_phase UUID;
  ALTER TABLE campaign_version ADD end_date TIMESTAMP;
`)

exports.down = knex => { }
