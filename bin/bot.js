'use strict';

var TopoBot = require( '../lib/topobot' ),
	path = require ( 'path' ),
	fs = require ( 'fs' ),
	configFile = path.join( __dirname , '../settings/settings.json' ),
	config = JSON.parse( fs.readFileSync( configFile ) );

var topobot = new TopoBot( {

    token: config.token,
    username: config.username,
    bridgeip: config.bridgeip,
    sonosip: config.sonosip,
    name: 'TopoBot'

} );

topobot.run();