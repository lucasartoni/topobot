'use strict';

var util = require( 'util' ),
	fs = require( 'fs' ),
	SlackBot = require( 'slackbots' ),
	hue = require( 'node-hue-api' ),
    HueApi = hue.HueApi,
    Sonos = require( 'sonos' ),
    ping = require( 'ping' );

// homefencing ping discovery setup
var away = false,
    away_time = 10 * 60 * 1000,
    last_seen = new Date();

// the class constructor
var TopoBot = function Constructor( settings ) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'topobot';
};

util.inherits( TopoBot , SlackBot );

TopoBot.prototype.run = function () {
    TopoBot.super_.call( this , this.settings );
    this.on( 'start' , this._onStart );
    this.on( 'message' , this._onMessage );
};

TopoBot.prototype._onStart = function () {
    this._loadBotUser();
    this._checkPhone( this.settings.phoneip );
};

TopoBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter( function ( user ) {
        return user.name === self.name;
    })[0];
};

// checks if the phone is in or out and fills the misses counter
TopoBot.prototype._checkPhone = function( phoneip ){
    var self = this;
    var checkPhone = setInterval( function( phoneip ) {
        ping.sys.probe( phoneip , function ( isAlive ) {
            
            var date_difference = new Date - last_seen;
            if ( isAlive ) { 
                last_seen = new Date();
            }
            if ( ( date_difference > away_time ) && ( !away ) ) {
                away = true;
                self._setAllOff();
            }
            if ( ( date_difference < away_time ) && ( away ) ){
                away = false;
                self._setAllLightsOn();
            }
        });
    }, 15 * 1000 , phoneip );
};

// Activates the dinner scene
TopoBot.prototype._setForDinner = function() {
	var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    // scene on my bridge that turns on the light over the dinner table
    hue.recallScene( 'a93790fec-on-0' );
}

// Activates the sleep scene
TopoBot.prototype._setForSleep = function() {
    var sonos = new Sonos.Sonos( this.settings.sonosip ),
        hue = new HueApi( this.settings.bridgeip , this.settings.username );

    sonos.addSpotify( '2UZZtkoLOg7IHxeTAdPFvd' , function ( err , res ) {
        
        // sets the volume
        sonos.setVolume( 20 , function ( err , data ) {
               
                // plays the song
                sonos.play();

        });
    });

    // call the presleep scene on hue - orange light
    hue.recallScene( 'ac69f0c3a-on-0' );   

    // sets a timer in 3 minutes that dims the light in 3 more minutes
    hue.scheduleEvent( {
        "name": "Timer",
        "description": "Turning all off",
        "command": {
            "method": "PUT",
            "address": "/api/JLtdKckn61HmlmJ3/groups/0/action",
            "body": {
                "scene": "1df3c4fd8-on-3"
            },
        },
        "localtime": String( new Date( new Date().getTime() + 63 * 60000 ).toISOString().substring( 0 , 19 ) ), 
        "autodelete": true
    });
}

// turns off lights and music
TopoBot.prototype._setAllOff = function() {
    var sonos = new Sonos.Sonos(this.settings.sonosip);
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    // music off
    sonos.stop(function (err, playing) {} );

    // lights off
    hue.recallScene( '1df3c4fd8-on-0' );   
}

// Turns on all lights
TopoBot.prototype._setAllLightsOn = function () {
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    // scene on my bridge that turns all lights
    hue.recallScene( 'a44f3d6a3-on-0' );
}

// gives the current status of the phone
TopoBot.prototype._giveCurrentPhoneStatus = function ( channel ) {
    var msg ='';
    if ( this.away ) {
        msg += 'Phone is away.\n';
    } else {
        seconds = new Date() - last_seen / 1000;
        msg += 'Phone was last seen ' + seconds + ' seconds ago' ;
    }

    this.postMessage( channel , msg , { as_user : true } );

    return true;
}

TopoBot.prototype._giveCurrentLightsStatus = function( channel , light ) {
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );
    var self = this;

    var updateStatus = function( status ) {
        var msg = status.name;
        if ( !status.state.reachable ){
            msg += ' N/A ';
        } else {
            msg += status.state.on ? ' ON ' : ' OFF ';
        }
        self.postMessage( channel , msg , { as_user : true } );
    };

    hue.lightStatus( light ).then( updateStatus ).done();

    return true;
}

TopoBot.prototype._giveCurrentMusicStatus = function( channel ) {
    var sonos = new Sonos.Sonos(this.settings.sonosip);
    var self = this;

    sonos.getCurrentState( function ( err , state ) {
        if ( state === 'playing' ) {
            sonos.currentTrack( function ( err , track ) {
                sonos.getVolume(function ( err , volume ) {
                    var msg = 'Playing: ' + track.artist + ' - ' + track.title + ' - Vol: ' + volume + '/100';
                    self.postMessage( channel , msg , { as_user : true } );
                })
            })
        } else {
            var msg = 'Music: stopped';
            self.postMessage( channel , msg , { as_user : true } );
        }
    });

    return true;
}

// Processing messages to find commands and make decisions
TopoBot.prototype._onMessage = function ( message ) {

    // gives a status update
    if ( this._isChatMessage( message ) &&
         this._isStatusRequest( message ) ) {

        // gets all the updates
        this._giveCurrentPhoneStatus( message.channel );
        this._giveCurrentLightsStatus( message.channel , 1 );
        this._giveCurrentLightsStatus( message.channel , 2 );
        this._giveCurrentLightsStatus( message.channel , 3 );
        this._giveCurrentLightsStatus( message.channel , 4 );
        this._giveCurrentLightsStatus( message.channel , 5 );
        this._giveCurrentLightsStatus( message.channel , 6 );
        this._giveCurrentMusicStatus( message.channel );
    }

    // reply to YO messages
    if ( this._isChatMessage( message ) &&
    	 this._isYO( message ) ) {

   			this.postMessage( message.channel , "YO back to you!" , { as_user : true } );

    }

    // requesting dinner lights
    if ( this._isMentioningTopoBot( message ) &&
    	 this._isLightSetting( message ) &&
    	 this._isMentionedDinner( message ) ){

    		this._setForDinner();
    		this.postMessage( message.channel , "Setting for dinner" , { as_user : true } );

    }
    // requesting for sleeping environment (music / light)
    if ( this._isMentioningTopoBot( message ) &&
         this._isGoingToSleep( message ) ) {

            this._setForSleep();
            this.postMessage( message.channel , "Sleep well, ttyl" , { as_user : true } );

    }
    // requesting a shutdown (music / light)
    if ( this._isMentioningTopoBot( message ) &&
         this._isMentionedShutdown( message ) ) {

            this._setAllOff();
            this.postMessage( message.channel , "Shutting down" , { as_user : true } );

    }
    // requesting for all lights on
    if ( this._isMentioningTopoBot( message ) &&
         this._isMentionedAllLightsOn( message ) ) {

            this._setAllLightsOn();
            this.postMessage( message.channel , "All lights are on" , { as_user : true } );

    }
    // killer signal
    if ( this._isMentioningTopoBot( message ) &&
         this._isKillerSignal( message ) ) {
            
            process.exit(1);

    }
};

// evaluating if sleep is involved
TopoBot.prototype._isGoingToSleep = function ( message ) {
    return message.type === 'message' && 
        message.text.toLowerCase().indexOf( 'going to sleep' ) > -1;
};

// evaluating if it's a chat message
TopoBot.prototype._isChatMessage = function ( message ) {
    return message.type === 'message' && 
        Boolean( message.text );
};

// evaluating a killer signal
TopoBot.prototype._isKillerSignal = function ( message ){
    return message.type === 'message' && 
        message.text.indexOf( 'kill yourself NOW' ) > -1;
};

// evaluating is dinner was mentioned in a message
TopoBot.prototype._isMentionedDinner = function ( message ){
	return message.type === 'message' && 
        message.text.toLowerCase().indexOf( 'dinner' ) > -1;
};

// evaluating if shutdown was mentioned in a message
TopoBot.prototype._isMentionedShutdown = function ( message ){
    return message.type === 'message' && (
        message.text.toLowerCase().indexOf( 'shutdown' ) > -1 ||
        message.text.toLowerCase().indexOf( 'shut down' ) > -1 );
};

// evaluating if shutdown was mentioned in a message
TopoBot.prototype._isMentionedAllLightsOn = function ( message ){
    return message.type === 'message' && (
        message.text.toLowerCase().indexOf( 'all lights on' ) > -1 ||
        message.text.toLowerCase().indexOf( 'sunshine' ) > -1 );
};

// evaluating if there was a YO message
TopoBot.prototype._isYO = function ( message ){
	return message.type === 'message' && 
        Boolean( message.text.toLowerCase() === 'yo');
};

// evaluatin if there is a request about lights
TopoBot.prototype._isLightSetting = function ( message ){
	return message.type === 'message' && 
        message.text.toLowerCase().indexOf( 'set lights for' ) > -1 ;
};

// evaluating if there is a request regarding music
TopoBot.prototype._isMusicSetting = function ( message ){
    return message.type === 'message' && 
        message.text.toLowerCase().indexOf( 'set music for' ) > -1 ;
};

// evaluating if there is a generic request
TopoBot.prototype._isSetting = function ( message ){
    return message.type === 'message' && 
        message.text.toLowerCase().indexOf( 'set for' ) > -1 ;
};

// evaluating if a message is from the bot itself
TopoBot.prototype._isFromTopoBot = function ( message ) {
    return message.user === this.user.id;
};

// evaluating if it's a status request
TopoBot.prototype._isStatusRequest = function ( message ) {
    return message.type === 'message' && 
        ( message.text.toLowerCase().indexOf( 'show current status' ) > -1 ||
        message.text.toLowerCase().indexOf( 'going on?' ) > -1 );
};

// evaluating if it's a direct message
TopoBot.prototype._isDirectMessage = function ( message ) {
    // TODO
    //
};

// evaluating if there was a mention of the bot
TopoBot.prototype._isMentioningTopoBot = function ( message ) {
    return message.type === 'message' && (
        message.text.toLowerCase().indexOf( 'topobot' ) > -1 || 
    	message.text.toLowerCase().indexOf( this.name ) > -1 );
};

module.exports = TopoBot;