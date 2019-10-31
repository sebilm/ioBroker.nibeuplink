'use strict';

/*
 * nibeuplink adapter
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here:
const Fetcher = require('./nibe-fetcher.js');

// For todays date;
Date.prototype.today = function () { 
    return this.getFullYear() + "-" + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + "-" + ((this.getDate() < 10)?"0":"") + this.getDate();
}

// For the time now
Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

// Helper functions:

/**
 * @param {utils.Adapter} adapter
 * @param {string} path
 * @param {string} name
 */
function createStringObject(adapter, path, name)
{
    adapter.setObjectNotExists(path, {
        type: 'state',
        common: {
            name: name,
            type: 'string',
            role: 'text'
        },
        native: {}
    });
}

/**
 * @param {utils.Adapter} adapter
 * @param {string} path
 * @param {string} name
 */
function createNumberObject(adapter, path, name)
{
    adapter.setObjectNotExists(path, {
        type: 'state',
        common: {
            name: name,
            type: 'number',
            role: 'value'
        },
        native: {}
    });
}

/**
 * @param {utils.Adapter} adapter
 * @param {string} path
 * @param {string} name
 */
function createChannel(adapter, path, name)
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

/**
 * @param {utils.Adapter} adapter
 */
function createInfoObjects(adapter)
{
    createChannel(adapter, "info",                    "Information");
    createStringObject(adapter, "info.updateTime",    "Last Update Time");
    createStringObject(adapter, "info.currentError",  "Current Error");
    createStringObject(adapter, "info.lastError",     "Last Error");
    createStringObject(adapter, "info.lastErrorTime", "Last Error Time");
    adapter.setObjectNotExists("info.connection", {
        type: 'state',
        common: {
            name: "If connected to Nibe Uplink",
            type: 'boolean',
            role: 'indicator.connected'
        },
        native: {}
    });
}

class NibeUplink extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'nibeuplink',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        // Initialize your adapter here

        this.log.info('Starting adapter.');
    
        var refreshInterval = this.config.Interval * 60;
        if (refreshInterval < 60)
            refreshInterval = 60;
    
        var error = false;
        if ((this.config.Identifier == "") || (this.config.Identifier == undefined))
        {
            this.log.error("Missing Identifier in the settings!");
            error = true;
        }
        if ((this.config.Secret == "") || (this.config.Secret == undefined))
        {
            this.log.error("Missing Secret in the settings!");
            error = true;
        }
        if ((this.config.CallbackURL == "") || (this.config.CallbackURL == undefined))
        {
            this.log.error("Missing Callback URL in the settings!");
            error = true;
        }
        if ((this.config.SystemId == "") || (this.config.SystemId == undefined))
        {
            this.log.error("Missing System ID in the settings!");
            error = true;
        }
        if (error)
        {
            createInfoObjects(this);
            this.setState("info.connection", {val: false, ack: true});
            this.setState("info.currentError", {val: "Missing settings!", ack: true});
            return;
        }    
    
        var f = new Fetcher({
            clientId: this.config.Identifier,
            clientSecret: this.config.Secret,
            redirectUri: this.config.CallbackURL,
            interval: refreshInterval,
            authCode: this.config.AuthCode,
            systemId: this.config.SystemId,
            language: this.config.Language
        }, this);
    
        f.on('data', (data) => {
            this.log.debug("Data received.");
            this.log.silly(JSON.stringify(data, null, ' '))        
    
            createInfoObjects(this);
            this.setState("info.connection", {val: true, expire: refreshInterval + 30, ack: true});
    
            var newDate = new Date();
            var datetime = newDate.today() + " " + newDate.timeNow();
            this.setState("info.updateTime", {val: datetime, ack: true});
            this.setState("info.currentError", {val: null, ack: true});

            for (var i in data) {
                var par = data[i];
                var key = par["key"];
                var title = par["title"];
                var designation = par["designation"];            
                if ((designation != undefined) && (designation != ""))
                {
                    title = title + " (" + designation + ")";
                }            
                var categoryId = par["categoryId"];                

                createChannel(this, categoryId, par["categoryName"]);

                var valuePath = categoryId + "." + key.toString().toUpperCase();
                this.setObjectNotExists(valuePath, {
                    type: 'state',
                    common: {
                        name: title,
                        type: 'number',
                        role: 'value',
                        unit: par["unit"]
                    },
                    native: {}
                });
                this.setState(valuePath, {val: par["value"], ack: true});
                var displayPath = categoryId + "." + key.toString().toUpperCase() + "_DISPLAY";
                this.setObjectNotExists(displayPath, {
                    type: 'state',
                    common: {
                        name: title + " [Display]",
                        type: 'string',
                        role: 'text'
                    },
                    native: {}
                });
                this.setState(displayPath, {val: par["displayValue"], ack: true});
               
                // update deprecated subpath values if present:            
                var parameterId = par["parameterId"];
                var path = categoryId + "." + parameterId;
                var adapter = this;
                (function(path, par) {
                    adapter.getObject(path, function (err, obj) {
                        if (obj) {
                            for (var p in par) {   
                                var parPath = path + "." + p;
                                if ((p == "value") || (p == "rawValue" || (p == "divideBy") || (p == "parameterId")))
                                    createNumberObject(adapter, parPath, p);
                                else if (p != "name")
                                    createStringObject(adapter, parPath, p);
                                    adapter.setState(parPath, {val: par[p], ack: true});
                            }     
                        }
                    });
                })(path, par);
                            
            }
            this.log.debug("Data processed.");
        });
        
    
        f.on('error', (data) => {
            this.log.error('' + data)
            
            createInfoObjects(this);
            this.setState("info.connection", {val: false, ack: true});
    
            var newDate = new Date();
            var datetime = newDate.today() + " " + newDate.timeNow();
            this.setState("info.lastErrorTime", {val: datetime, ack: true});
            this.setState("info.lastError", {val: '' + data, ack: true});        
            this.setState("info.currentError", {val: '' + data, ack: true});
        });    
    
        this.log.info('Adapter started.');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.setState("info.connection", {val: false, ack: true});
            this.log.info('Cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new NibeUplink(options);
} else {
    // otherwise start the instance directly
    new NibeUplink();
}
