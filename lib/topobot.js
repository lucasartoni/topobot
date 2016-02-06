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
    TopoBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

TopoBot.prototype._onStart = function () {
    this._loadBotUser();
};

TopoBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

TopoBot.prototype._onMessage = function (message) {

    if (this._isChatMessage(message)) {
    	console.log(message);
    }
    if (this._isChatMessage(message) &&
    	this._isYO(message)
    	) {
   			this.postMessage(message.user,"YO back at you, sir",{as_user: true});
    }
};

TopoBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

TopoBot.prototype._isYO = function (message){
	return message.type === 'message' && Boolean(message.text === 'YO');
};

TopoBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

TopoBot.prototype._isFromTopoBot = function (message) {
    return message.user === this.user.id;
};

TopoBot.prototype._isMentioningTopoBot = function (message) {
    return message.text.toLowerCase().indexOf('topobot') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

TopoBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = TopoBot;