exports.up = knex => knex.raw(`
  ALTER TABLE campaign_version ADD ignore_open_tickets BOOLEAN DEFAULT(false);
  ALTER TABLE campaign_version ADD first_message JSONB;
`)

exports.down = knex => { }
