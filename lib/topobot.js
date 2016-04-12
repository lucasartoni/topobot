'use strict';

var util = require( 'util' ),
    SlackBot = require( 'slackbots' ),
    hue = require( 'node-hue-api' ),
    HueApi = hue.HueApi,
    Sonos = require( 'sonos' );

// homefencing ping discovery setup
var away = false,
    is_armed = false,
    entrance = false,
    last_seen = new Date();

var MESSAGE_TYPE = 'message',
    AWAY_CHECK_SEC_CYCLE = 60,
    LIGHT_CHECK_SEC_CYCLE = 10,
    DEBUG_CHANNEL = 'debug',
    DEBUG_MODE = true;

var message_contains =  function (strings, caseSensitive) {
    var caseSensitive = caseSensitive || false;
    return function (message) {
        return message.type === MESSAGE_TYPE && strings.some(function (string) {
            if (caseSensitive) {
              return message.text.indexOf(string) > -1;
            } else {
              return message.text.toLowerCase().indexOf(string) > -1;
            }
        });
    }
}

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
    this._log( 'Starting up at: ' + new Date() );
    this._check_away();
    this._updateArmed( this.settings.led_strip_id );
    this._updateEntrance( this.settings.entrance_id );
};

TopoBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter( function ( user ) {
        return user.name === self.name;
    })[0];
};

TopoBot.prototype._log = function ( message, callback ) {
    if ( ! DEBUG_MODE ) {
      return callback();
    }
    this.postMessageToChannel( DEBUG_CHANNEL , message , { as_user : true } , callback );
}

TopoBot.prototype._updateArmed = function( led_strip_id ) {
    
    var self = this;
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    setInterval( function () {
        var checkIfGoingOut = function ( result ){
          self.is_armed = ( result.state.on && result.state.bri === 254 && result.state.hue === 47110 && result.state.sat === 253 );
        }

        hue.lightStatus( led_strip_id , function( err, result ) {
           if (err) throw err;
           checkIfGoingOut( result );
        });
    }, LIGHT_CHECK_SEC_CYCLE * 1000 );

};

TopoBot.prototype._updateEntrance = function( entrance_id ) {
    
    var self = this;
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    setInterval( function () {

        var checkIfEntrance = function ( result ){
            self.entrance = ( result.state.on );
        }

        hue.lightStatus( entrance_id , function( err, result ) {
            if (err) throw err;
            checkIfEntrance( result );
        });
    }, LIGHT_CHECK_SEC_CYCLE * 1000 );

};

TopoBot.prototype._setAway = function( status ) {
    away = status;
    if ( away ) {
        last_seen = new Date();
    }
};


// checks if the phone is in or out and fills the misses counter
TopoBot.prototype._check_away = function(){
    var self = this;

    var checkLedStrip = setInterval( function() {
        
        if ( ( self.is_armed) && ( !away ) ) {
            self._setAway( true );
            self._setAllOff();

            self._log( 'People went away at: ' + new Date() );
        } else if ( ( self.entrance ) && ( away ) ){
            self._setAway( false );
            self._setWelcomeBack();
            self._log( 'People came back at: ' + new Date () );
        }

    }, AWAY_CHECK_SEC_CYCLE * 1000 );
};

// Activates the dinner scene
TopoBot.prototype._setForDinner = function () {
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

TopoBot.prototype._setWelcomeBack = function () {
    var sonos = new Sonos.Sonos(this.settings.sonosip);
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );

    //welcome back sound
    //sonos.setVolume ( 50 , function () {
    //    sonos.play( 'http://172.16.12.173/welcomeback.mp3' , function ( err, playing ) {} ); 
    //});

    // scene on my bridge that turns all lights
    hue.recallScene( 'a44f3d6a3-on-0' );
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
        var seconds = Math.round( ( new Date() - last_seen ) / 1000 );
        msg += 'Phone was last seen ' + seconds + ' seconds ago' ;
    }

    this.postMessage( channel , msg , { as_user : true } );

    return true;
}

TopoBot.prototype._giveCurrentLightsStatus = function( channel , light ) {
    var hue = new HueApi( this.settings.bridgeip , this.settings.username );
    var self = this;

    var updateStatus = function( status ) {
        var msg = status.name + ': ';
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


TopoBot.prototype._giveAwayStatus = function( channel ) {
    var self = this;
    var msg = away ? 'Humans are away since: ' + last_seen : 'Humans are home';
    self.postMessage( channel, msg, { as_user : true } );
};

// Processing messages to find commands and make decisions
TopoBot.prototype._onMessage = function ( message ) {

    // gives a status update
    if ( this._isChatMessage( message ) &&
         this._isStatusRequest( message ) ) {

        // lights
        for ( var i = 1; i < 7; i++ ){
            this._giveCurrentLightsStatus( message.channel , i );
        }
        this._giveCurrentMusicStatus( message.channel );
        this._giveAwayStatus( message.channel );

    }

    // reply to YO messages
    if ( this._isChatMessage( message ) &&
       this._isYO( message ) ) {

         this.postMessage( message.channel , "YO back to you!" , { as_user : true } );

    }

    // turning debug on
    if ( this._isMentioningTopoBot( message ) &&
        this._isTurnOnDebug ( message ) ){

        this._log( 'Debug turned on at: ' + new Date() );
        this.DEBUG_MODE = true;
        this.postMessage( message.channel , "Turning debug on" , { as_user : true } );

    }

    // turning debug off
    if ( this._isMentioningTopoBot( message ) &&
        this._isTurnOffDebug ( message ) ){

        this._log( 'Debug turned off at: ' + new Date() );
        this.DEBUG_MODE = false;
        this.postMessage( message.channel , "Turning debug off" , { as_user : true } );

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
            this._log( 'Terminating at: ' + new Date() , function exit () {
                process.exit( 1 );
            });
    }
};

// evaluating if it's a chat message
TopoBot.prototype._isChatMessage = function ( message ) {
    return message.type === MESSAGE_TYPE && 
        Boolean( message.text );
};

// evaluating if there was a YO message
TopoBot.prototype._isYO = function ( message ){
  return message.type === MESSAGE_TYPE && 
        Boolean( message.text.toLowerCase() === 'yo');
};

// evaluating if a message is from the bot itself
TopoBot.prototype._isFromTopoBot = function ( message ) {
    return message.user === this.user.id;
};


// evaluating a killer signal
TopoBot.prototype._isKillerSignal = message_contains(['kill yourself NOW'], true);

// evaluating if turning on debug
TopoBot.prototype._isTurnOnDebug = message_contains(['debug on']);

// evaluating if turning off debug
TopoBot.prototype._isTurnOffDebug = message_contains(['debug off']);

// evaluating if sleep is involved
TopoBot.prototype._isGoingToSleep = message_contains(['going to sleep']);

// evaluating is dinner was mentioned in a message
TopoBot.prototype._isMentionedDinner = message_contains(['dinner']); 

// evaluating if shutdown was mentioned in a message
TopoBot.prototype._isMentionedShutdown = message_contains(['shutdown', 'shut down']);

// evaluating if shutdown was mentioned in a message
TopoBot.prototype._isMentionedAllLightsOn = message_contains(['all lights on', 'sunshine']);

// evaluatin if there is a request about lights
TopoBot.prototype._isLightSetting = message_contains(['set lights for']);

// evaluating if there is a request regarding music
TopoBot.prototype._isMusicSetting = message_contains(['set music for']);

// evaluating if there is a generic request
TopoBot.prototype._isSetting = message_contains(['set for']);

// evaluating if it's a status request
TopoBot.prototype._isStatusRequest = message_contains(['show current status', 'going on?']);

// evaluating if it's a direct message
TopoBot.prototype._isDirectMessage = function ( message ) {
    // TODO
    //
};

// evaluating if there was a mention of the bot
TopoBot.prototype._isMentioningTopoBot = message_contains(['topobot', this.name]);

module.exports = TopoBot;
