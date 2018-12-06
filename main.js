/**
 *
 * nibeuplink adapter 
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.nibeuplink.0
const adapter = new utils.Adapter('nibeuplink');

const Fetcher = require('nibe-fetcher')

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let variable = 1234;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

// For todays date;
Date.prototype.today = function () { 
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

function createStringObject(path, name)
{
    adapter.setObjectNotExists(path, {
        type: 'state',
        common: {
            name: name,
            type: 'string',
            role: 'value'
        },
        native: {}
    });
}

function createChannel(path, name)
{
    adapter.setObjectNotExists(path, {
        type: 'channel',
        common: {
            name: name,
            type: 'string',
            role: 'text'
        },
        native: {}
    });
}

function createInfoObjects()
{
    createChannel("info",                    "Information");
    createStringObject("info.updateTime",    "Last Update Time");
    createStringObject("info.currentError",  "Current Error");
    createStringObject("info.lastError",     "Last Error");
    createStringObject("info.lastErrorTime", "Last Error Time");
}


function main() {

    adapter.log.info('Starting adapter.');
    
    var f = new Fetcher({
        clientId: adapter.config.Identifier,
        clientSecret: adapter.config.Secret,
        redirectUri: adapter.config.CallbackURL,
        interval: 60,
        authCode: adapter.config.AuthCode,
        systemId: adapter.config.SystemId
    });

    f.on('data', (data) => {
        adapter.log.debug("Data received:");
        adapter.log.debug(JSON.stringify(data, null, ' '))        

        createInfoObjects();

        var newDate = new Date();
        var datetime = newDate.today() + " " + newDate.timeNow();
        adapter.setState("info.updateTime", {val: datetime, ack: true});
        adapter.setState("info.currentError", {val: null, ack: true});

        for (var i in data) {            
            var par = data[i];
            var title = par["title"];
            var parameterId = par["parameterId"];
            var categoryId = par ["categoryId"];
            var path = categoryId + "." + parameterId;
            createChannel(path, title);
            
            for (var p in par) {   
                var parPath = path + "." + p;
                var value = par[p];
                createStringObject(parPath, p);
                adapter.setState(parPath, {val: value, ack: true});
            }            
        }
        adapter.log.debug("Data processed.");
    });
    

    f.on('error', (data) => {
        adapter.log.error('' + data)
        
        createInfoObjects();

        var newDate = new Date();
        var datetime = newDate.today() + " @ " + newDate.timeNow();
        adapter.setState("info.lastErrorTime", {val: datetime, ack: true});
        adapter.setState("info.lastError", {val: '' + data, ack: true});        
        adapter.setState("info.currentError", {val: '' + data, ack: true});
    });    

    adapter.log.info('Adapter started.');
    
    // in this nibeuplink all states changes inside the adapters namespace are subscribed
    //adapter.subscribeStates('*');
}
