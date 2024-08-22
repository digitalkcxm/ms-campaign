exports.up = knex => knex.raw('ALTER TABLE campaign_version ADD file_url VARCHAR(256);')
exports.down = knex => { }
