'use strict';

var TopoBot = require('../lib/topobot');

var token = process.env.BOT_API_KEY;

var topobot = new TopoBot({
    token: token,
    name: 'TopoBot'
});

topobot.run();