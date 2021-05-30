'use strict';

/*
 * nibeuplink adapter
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const path = require('path');
const tools = require(utils.controllerDir + '/lib/tools');
const fs = require('fs');

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
function createDevice(adapter, path, name)
{
    adapter.setObjectNotExists(path, {
        type: 'device',
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

class NibeUplink extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'nibeuplink',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        // Initialize your adapter here

        this.log.info('Starting adapter.');
    
        let refreshInterval = this.config.Interval * 60;
        if (refreshInterval < 60) {
            refreshInterval = 60;
        }

        let identifier = this.config.Identifier.trim();
        let secret = this.config.Secret.trim();
        let callbackURL = this.config.CallbackURL.trim();
        let configured = this.config.Configured;
    
        let error = false;
        if ((identifier == "") || (identifier == undefined))
        {
            if (configured != false) {
                this.log.error("Missing Identifier in the settings!");
            }
            error = true;
        }
        if ((secret == "") || (secret == undefined))
        {
            if (configured != false) {
                this.log.error("Missing Secret in the settings!");
            }
            error = true;
        }
        if ((callbackURL == "") || (callbackURL == undefined))
        {
            if (configured != false) {
                this.log.error("Missing Callback URL in the settings!");
            }
            error = true;
        }
        if ((this.config.SystemId == "") || (this.config.SystemId == undefined))
        {
            if (configured != false) {
                this.log.error("Missing System ID in the settings!");
            }
            error = true;
        }
        if (error)
        {
            this.setState("info.connection", {val: false, ack: true});
            this.setState("info.currentError", {val: "Missing settings!", ack: true});
            return;
        }

        let dataDir = path.normalize(utils.controllerDir + '/' + tools.getDefaultDataDir());
        let storeDir = path.join(dataDir, "nibeuplink");
        try {
            // create directory
            if (!fs.existsSync(storeDir)) {
                fs.mkdirSync(storeDir);
            }
        } catch (err) {
            this.log.error('Could not create storage directory (' + storeDir + '): ' + err);
            storeDir = __dirname;
        }
        let storeFile = path.join(storeDir, "session." + this.instance + ".json");        
    
        this.fetcher = new Fetcher({
            clientId: identifier,
            clientSecret: secret,
            redirectUri: callbackURL,
            interval: refreshInterval,
            authCode: this.config.AuthCode.trim(),
            systemId: this.config.SystemId,
            language: this.config.Language,
            enableManage: this.config.EnableManageSupport,
            sessionStore: storeFile
        }, this);
    
        this.fetcher.on('data', (data) => {
            this.log.debug("Data received.");
            this.log.silly(JSON.stringify(data, null, ' '));

            this.setState("info.connection", {val: true, expire: refreshInterval + 30, ack: true});
    
            let newDate = new Date();
            let datetime = newDate.today() + " " + newDate.timeNow();
            this.setState("info.updateTime", {val: datetime, ack: true});
            this.setState("info.currentError", {val: "", ack: true});

            data.forEach(unit => {
                let unitPath = `UNIT_${unit.systemUnitId}`;
                createDevice(this, unitPath, `${unit.name} (${unit.product})`);
                unit.categories.forEach(category => {
                    let categoryPath = `${unitPath}.${category.categoryId}`;
                    createChannel(this, categoryPath, category.name);
                    category.parameters.forEach(parameter => {
                        let key = parameter["key"];
                        let title = parameter["title"];
                        let designation = parameter["designation"];            
                        if ((designation != null) && (designation != ""))
                        {
                            title = `${title} (${designation})`;
                        }
                        let valuePath = `${categoryPath}.${key}`;

                        this.setObjectNotExists(valuePath, {
                            type: 'state',
                            common: {
                                name: title,
                                type: 'number',
                                role: 'value',
                                unit: parameter["unit"]
                            },
                            native: {}
                        });
                        this.setState(valuePath, {val: parameter["value"], ack: true});
                        
                        let displayPath = `${categoryPath}.${key}_DISPLAY`;
                        this.setObjectNotExists(displayPath, {
                            type: 'state',
                            common: {
                                name: `${title} [Display]`,
                                type: 'string',
                                role: 'text'
                            },
                            native: {}
                        });
                        this.setState(displayPath, {val: parameter["displayValue"], ack: true});
                    
                        if (unit.systemUnitId == 0)
                        {
                            let adapter = this;

                            // update deprecated subpath values if present (pre 0.4.0):
                            let oldValuePath = `${category.categoryId}.${key}`;
                            this.getObject(oldValuePath, function (err, obj) {
                                if (obj) {
                                    adapter.setState(oldValuePath, {val: parameter["value"], ack: true});
                                }
                            });
                            let oldDisplayPath = `${category.categoryId}.${key}_DISPLAY`;
                            this.getObject(oldDisplayPath, function (err, obj) {
                                if (obj) {
                                    adapter.setState(oldDisplayPath, {val: parameter["displayValue"], ack: true});
                                }
                            });

                            // update deprecated subpath values if present (very old):
                            let parameterId = parameter["parameterId"];
                            let path = category.categoryId + "." + parameterId;                            
                            (function(path, par) {
                                adapter.getObject(path, function (err, obj) {
                                    if (obj) {
                                        for (let p in par) {   
                                            let parPath = path + "." + p;
                                            if ((p == "value") || (p == "rawValue" || (p == "divideBy") || (p == "parameterId"))) {
                                                createNumberObject(adapter, parPath, p);
                                            }
                                            else if (p != "name") {
                                                createStringObject(adapter, parPath, p);
                                                adapter.setState(parPath, {val: par[p], ack: true});
                                            }
                                        }     
                                    }
                                });
                            })(path, parameter);
                        }
                    })
                })
            });
            this.log.debug("Data processed.");
        });
        
    
        this.fetcher.on('error', (data) => {
            this.log.error('' + data);
            
            this.setState("info.connection", {val: false, ack: true});
    
            let newDate = new Date();
            let datetime = newDate.today() + " " + newDate.timeNow();
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
            if (this.fetcher != null) {
                this.fetcher.stop();
            }
            this.fetcher = null;
            this.setState("info.connection", {val: false, ack: true});
            this.log.info('Cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

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

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
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

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new NibeUplink(options);
} else {
    // otherwise start the instance directly
    new NibeUplink();
}
