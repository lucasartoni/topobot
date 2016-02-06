'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var Bot = require('slackbots');

// create a bot 
var topobot = new SlackBot({
    token: '',
    name: 'Topo Bot'
});
 
topobot.on('start', function() {

    var params = {
        icon_emoji: ':mouse:'
    };
    
    bot.postMessageToChannel('random', 'meow!', params);

});