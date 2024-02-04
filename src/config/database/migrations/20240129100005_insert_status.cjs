exports.up = knex => knex.raw('INSERT INTO status (name) VALUES (\'draft\'), (\'scheduled\'), (\'running\'), (\'canceled\'), (\'error\'), (\'finished\');')

exports.down = knex => { }

