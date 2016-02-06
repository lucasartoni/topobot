'use strict';

var util = require( 'util' ),
	fs = require( 'fs' ),
	SlackBot = require( 'slackbots' );

var TopoBot = function Constructor( settings ) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'topobot';
};

util.inherits( TopoBot, SlackBot );

module.exports = TopoBot;


TopoBot.prototype.run = function () {
    TopoBot.super_.call( this , this.settings );

    this.on( 'start' , this._onStart );
    this.on( 'message' , this._onMessage );
};

TopoBot.prototype._onStart = function () {
    this._loadBotUser();
};

TopoBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter( function ( user ) {
        return user.name === self.name;
    })[0];
};

TopoBot.prototype._onMessage = function ( message ) {

        if ( this._isChatMessage( message ) &&
    		 this._isYO( message )) {

   			this.postMessage( message.channel , "YO back to you, sir" , { as_user : true } );

    }
    if  ( this._isMentioningTopoBot( message ) &&
    	  this._isLightSetting( message ) &&
    	  this._isMentionedDinner( message ) ){

    		this.postMessage( message.channel , "Setting lights for dinner" , { as_user : true } );

    }
};

TopoBot.prototype._isChatMessage = function ( message ) {
    return message.type === 'message' && Boolean( message.text );
};

TopoBot.prototype._isMentionedDinner = function ( message ){
	return message.type === 'message' && message.text.toLowerCase().indexOf( 'dinner' ) > -1;
};

TopoBot.prototype._isYO = function ( message ){
	return message.type === 'message' && Boolean( message.text.toLowerCase() === 'yo');
};
TopoBot.prototype._isLightSetting = function ( message ){
	return message.type === 'message' && message.text.toLowerCase().indexOf( 'set lights for' ) > -1 ;
};

TopoBot.prototype._isFromTopoBot = function ( message ) {
    return message.user === this.user.id;
};

TopoBot.prototype._isMentioningTopoBot = function ( message ) {
    return message.type === 'message' &&
       ( message.text.toLowerCase().indexOf( 'topobot' ) > -1 || 
    	 message.text.toLowerCase().indexOf( this.name ) > -1 );
};


module.exports = TopoBot;