'use strict';

var TopoBot = require( '../lib/topobot' ),
	path = require ( 'path' ),
	fs = require ( 'fs' ),
	configFile = path.join( __dirname , '../settings/settings.json' ),
	config = JSON.parse( fs.readFileSync( configFile ) );

var topobot = new TopoBot( {

    token : config.token,
    username : config.username,
    bridgeip : config.bridgeip,
    sonosip : config.sonosip,
    led_strip_id : config.led_strip_id,
    entrance_id : config.entrance_id,
    name : 'TopoBot'

} );

topobot.run();