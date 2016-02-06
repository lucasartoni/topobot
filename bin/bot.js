'use strict';

var TopoBot = require('../lib/topobot');

var token = process.env.BOT_API_KEY || require( '../settings/token' ),
	username = process.env.USERNAME || require( '../settings/username'),
	bridgeip = process.env.BRIDGEIP || require( '../settings/bridgeip');



var topobot = new TopoBot({
    token: token,
    username: username,
    bridgeip: bridgeip,
    name: 'TopoBot'
});

topobot.run();