//
// nibe-fetcher
//
// original author: Timo Behrmann (timo.behrmann@gmail.com)
//
// sources: https://github.com/z0mt3c/nibe-fetcher
//
// license: MIT
//
// this version is based on nibe-fetcher version 1.1.0
//

const EventEmitter = require('events');
const Hoek = require('@hapi/hoek');
const Wreck = require('@hapi/wreck');
const querystring = require('querystring');
const async = require('async');
const info = require('./package.json');
const jsonfile = require('jsonfile');
const Path = require('path');
const fs = require('fs');

const defaultOptions = {
  clientId: null,
  clientSecret: null,
  systemId: null,
  baseUrl: 'https://api.nibeuplink.com',
  redirectUri: 'https://z0mt3c.github.io/nibe.html',
  scope: 'READSYSTEM',
  timeout: 45000,
  maxBytes: 1048576,
  followRedirects: 2,
  userAgent: [info.name, info.version].join(' '),
  parameters: {
    '10001': {
      'key': 'FAN_SPEED',
      'divideBy': 0
    },
    '10012': {
      'key': 'CPR_INFO_EP14_BLOCKED',
      'divideBy': 0
    },
    '10033': {
      'key': 'ADDITION_BLOCKED',
      'divideBy': 0
    },
    '40004': {
      'key': 'OUTDOOR_TEMP_BT1',
      'divideBy': 10
    },
    '40008': {
      'key': 'HEAT_MEDIUM_FLOW_BT2',
      'divideBy': 10
    },
    '40012': {
      'key': 'RETURN_TEMP_EB100_EP14_BT3',
      'divideBy': 10
    },
    '40013': {
      'key': 'HOT_WATER_TOP_BT7',
      'divideBy': 10
    },
    '40014': {
      'key': 'HOT_WATER_CHARGING_BT6',
      'divideBy': 10
    },
    '40015': {
      'key': 'BRINE_IN_EB100_EP14_BT10',
      'divideBy': 10
    },
    '40016': {
      'key': 'BRINE_OUT_EB100_EP14_BT11',
      'divideBy': 10
    },
    '40017': {
      'key': 'CONDENSER_OUT_EB100_EP14_BT12',
      'divideBy': 10
    },
    '40018': {
      'key': 'HOT_GAS_EB100_EP14_BT14',
      'divideBy': 10
    },
    '40019': {
      'key': 'LIQUID_LINE_EB100_EP14_BT15',
      'divideBy': 10
    },
    '40020': {
      'key': 'EVAPORATOR_EB100_BT16',
      'divideBy': 10
    },
    '40022': {
      'key': 'SUCTION_GAS_EB100_EP14_BT17',
      'divideBy': 10
    },
    '40025': {
      'key': 'EXHAUST_AIR_BT20',
      'divideBy': 10
    },
    '40026': {
      'key': 'EXTRACT_AIR_BT21',
      'divideBy': 10
    },
    '40033': {
      'key': 'ROOM_TEMPERATURE_BT50',
      'divideBy': 10
    },
    '40047': {
      'key': 'HEAT_MEDIUM_FLOW_EB100_BT61',
      'divideBy': 10
    },
    '40048': {
      'key': 'HEAT_MEDIUM_RETURN_EB100_BT62',
      'divideBy': 10
    },
    '40050': {
      'key': 'VALUE_AIR_VELOCITY_SENSOR_EB100_BS1',
      'divideBy': 10
    },
    '40067': {
      'key': 'AVG_OUTDOOR_TEMP_BT1',
      'divideBy': 10
    },
    '40071': {
      'key': 'EXTERNAL_FLOW_TEMP_BT25',
      'divideBy': 10
    },
    '40072': {
      'key': 'FLOW_BF1',
      'divideBy': 10
    },
    '40079': {
      'key': 'CURRENT_EB100_BE3',
      'divideBy': 10
    },
    '40081': {
      'key': 'CURRENT_EB100_BE2',
      'divideBy': 10
    },
    '40083': {
      'key': 'CURRENT_EB100_BE1',
      'divideBy': 10
    },
    '40101': {
      'key': 'INCOMING_AIR_TEMP',
      'divideBy': 10
    },
    '40771': {
      'key': 'POOL2_COMPR_ONLY_EP14',
      'divideBy': 10
    },
    '40919': {
      'key': 'outdoor_air_mix_status',
      'divideBy': 0
    },
    '41026': {
      'key': 'VALUE_AIR_VELOCITY_SENSOR_EB100_BS1',
      'divideBy': 10
    },
    '43005': {
      'key': 'DEGREE_MINUTES',
      'divideBy': 10
    },
    '43009': {
      'key': 'CALCULATED_FLOW_TEMP_S1',
      'divideBy': 10
    },
    '43064': {
      'key': 'HEAT_DT_CALC_VALUE',
      'divideBy': 10
    },
    '43065': {
      'key': 'HEAT_DT_IS_BT12_BT63_BT3',
      'divideBy': 10
    },
    '43066': {
      'key': 'DEFROSTING_TIME'
    },
    '43081': {
      'key': 'ADDITION_TIME_FACTOR',
      'divideBy': 10
    },
    '43084': {
      'key': 'ELECTRICAL_ADDITION_POWER',
      'divideBy': 10
    },    
    '43115': {
      'key': 'HW_CHARGE_CALC_VALUE',
      'divideBy': 10
    },
    '43116': {
      'key': 'HW_CURR_CHARGE_VAL_BT12_BT63',
      'divideBy': 10
    },
    '43123': {
      'key': 'ALLOWED_COMPR_FREQ'
    },
    '43124': {
      'key': 'REFERENCE_AIR_VELOCITY_SENSOR',
      'divideBy': 10
    },
    '43125': {
      'key': 'DECREASE_FROM_REFERENCE',
      'divideBy': 10
    },
    '43136': {
      'key': 'CURRENT_COMPR_FREQUENCY',
      'divideBy': 10
    },
    '43144': {
      'key': 'COMPRESSOR_TIME_FACTOR',
      'divideBy': 100
    },
    '43146': {
      'key': 'DT_INVERTER_EXHAUST_AIR',
      'divideBy': 10
    },
    '43161': {
      'key': 'EXTERNAL_ADJUSTMENT_S1',
      'divideBy': 0
    },
    '43181': {
      'key': 'SPEED_HEAT_MED_PUMP_1',
    },
    '43305': {
      'key': 'COMPRESSOR_TIME_FACTOR_HOT_WATER',
      'divideBy': 100
    },
    '43371': {
      'key': 'HOTGAS_LIMIT',
    },
    '43372': {
      'key': 'EVAPORATING_LIMIT',
    },
    '43416': {
      'key': 'COMPRESSOR_STARTS_EB100_EP14',
      'divideBy': 0
    },
    '43420': {
      'key': 'COMPRESSOR_OPERATING_TIME_EB100_EP14',
      'divideBy': 0
    },
    '43424': {
      'key': 'COMPRESSOR_OPERATING_TIME_HOT_WATER_EB100_EP14',
      'divideBy': 0
    },
    '43437': {
      'key': 'PUMP_SPEED_HEATING_MEDIUM_EP14',
      'divideBy': 0
    },
    '43439': {
      'key': 'BRINE_PUMP_SPEED_EP14_GP2',
      'divideBy': 0
    },
    '44298': {
      'key': 'HW_INCL_INT_ADD_EP14',
      'divideBy': 10
    },
    '44300': {
      'key': 'HEATING_INT_ADD_INCL_EP14',
      'divideBy': 10
    },
    '44304': {
      'key': 'POOL_COMPR_ONLY_EP14',
      'divideBy': 10
    },
    '44306': {
      'key': 'HOTWATER_COMPR_ONLY_EP14',
      'divideBy': 10
    },
    '44308': {
      'key': 'HEATING_COMPR_ONLY_EP14',
      'divideBy': 10
    },
    '47212': {
      'key': 'SET_MAX_ELECTRICAL_ADDITION',
      'divideBy': 100
    },
    '47214': {
      'key': 'ADDITION_FUSE_SIZE',
      'divideBy': 0
    },
    '47276': {
      'key': 'FLOOR_DRYING_FUNCTION',
      'divideBy': 0
    },
    '47407': {
      'key': 'AUX_5',
      'divideBy': 0
    },
    '47408': {
      'key': 'AUX_4',
      'divideBy': 0
    },
    '47409': {
      'key': 'AUX_3',
      'divideBy': 0
    },
    '47410': {
      'key': 'AUX_2',
      'divideBy': 0
    },
    '47411': {
      'key': 'AUX_1',
      'divideBy': 0
    },
    '47412': {
      'key': 'AUX_X7',
      'divideBy': 0
    },
    '48745': {
      'key': 'COUNTRY',
      'divideBy': 0
    }
  },
  interval: 60,
  language: 'en',
  renewBeforeExpiry: 5 * 60 * 1000,
  sessionStore: Path.join(__dirname, './.session.json')
}

class Fetcher extends EventEmitter {
  constructor (options, adapter) {
    super()

    this.adapter = adapter;

    this.options = Hoek.applyToDefaults(defaultOptions, options || {})

    this.wreck = Wreck.defaults({
      baseUrl: this.options.baseUrl,
      headers: { 'user-agent': this.options.userAgent },
      redirects: this.options.followRedirects,
      timeout: this.options.timeout,
      maxBytes: this.options.maxBytes
    })

    this.start();
  }

  fetch (callback) {
    this.adapter.log.debug("fetch()");
    async.waterfall([
      (callback) => {
        if (this._hasRefreshToken())
          return callback();
        if (this.options.authCode) {
          this.token(this.options.authCode)
            .then((data) => callback(), (error) => callback(error))
          return;
        } else {
          this.adapter.log.error("You need to get and set a new Auth-Code. You can do this in the adapter setting.");
          this.stop();
        }
      },
      (callback) => {
        if (!this._isTokenExpired())
          return callback();
        this.adapter.log.debug('Token is expired / expires soon - refreshing');
        this.refreshToken().then((data) => callback(), (error) => callback(error));
      },
      (callback) => {
        if (this.categories != null)
          return callback();
        this.adapter.log.debug('Loading categories');
        this.fetchCategories().then((data) => {
          callback();
        }, (error) => {
          callback(error);
        })
      },
      (callback) => {
        this.fetchAllParams().then((data) => {
          callback();
        }, (error) => {
          callback(error);
        })
      }
    ], (error) => {
      if (error) {
        this._onError(error);
      }
      callback();
    })
  }

  start () {
    if (this._interval)
      return;
    var active = false;

    var exec = () => {
      if (active)
        return;
      active = true;
      this.fetch(() => {
        active = false;
      })
    }

    this._interval = setInterval(exec, this.options.interval * 1000);
    exec();
  }

  stop () {
    if (!this._interval)
      return;
    clearInterval(this._interval);
    this._interval = null;
  }

  clear () {
    this.adapter.log.debug("clear()");
    this.setSesssion({});
  }

  token (code) {
    this.adapter.log.debug("token()");
    const data = {
      grant_type: 'authorization_code',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: code,
      redirect_uri: this.options.redirectUri,
      scope: this.options.scope
    }
    return new Promise(async (resolve, reject) => {
      try {
        const { response, payload } = await this.wreck.post('/oauth/token', {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          json: true,
          payload: querystring.stringify(data)
        });
        if (this._isError(response))
          return reject(new Error(response.statusCode + ': ' + response.statusMessage));
        payload.expires_at = Date.now() + (payload.expires_in * 1000);
        this.setSesssion(payload);
        return resolve(payload);
      }
      catch (error) {
        return reject(error);
      }
    });
  }

  refreshToken () {
    this.adapter.log.debug("Refresh token.");
    const data = {
      grant_type: 'refresh_token',
      refresh_token: this.getSession('refresh_token'),
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret
    }
    return new Promise(async (resolve, reject) => {
      try {
        const { response, payload } = await this.wreck.post('/oauth/token', {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          json: true,
          payload: querystring.stringify(data)
        });
        if (this._isError(response))
          return reject(new Error(response.statusCode + ': ' + response.statusMessage));
        payload.expires_at = Date.now() + (payload.expires_in * 1000);
        this.setSesssion(payload);
        return resolve(payload);
      }
      catch (error) {
        return reject(error);
      }
    });
  }

  fetchCategories () {
    this.adapter.log.debug("Fetch categories.");
    const systemId = this.options.systemId;
    return new Promise(async (resolve, reject) => {
      try {
        const { response, payload } = await this.wreck.get(`/api/v1/systems/${systemId}/serviceinfo/categories`, {
          headers: {
            Authorization: 'Bearer ' + this.getSession('access_token'),
            'Accept-Language': this.options.language,
          },
          json: true
        });
        if (this._isError(response))
          return reject(new Error(response.statusCode + ': ' + response.statusMessage));
        this.categories = payload;
        return resolve(payload);
      }
      catch (error) {
        return reject(error);
      }
    });
  }

  fetchParams (category) {
    this.adapter.log.debug("Fetch params.");
    const systemId = this.options.systemId;
    return new Promise(async (resolve, reject) => {
      try {
        const { response, payload } = await this.wreck.get(`/api/v1/systems/${systemId}/serviceinfo/categories/status?categoryId=${category}`, {
          headers: {
            Authorization: 'Bearer ' + this.getSession('access_token'),
            'Accept-Language': this.options.language,
          },
          json: true
        });
        if (this._isError(response))
          return reject(new Error(response.statusCode + ': ' + response.statusMessage));
        return resolve(payload);
      }
      catch (error) {
        return reject(error);
      }
    });
  }

  fetchAllParams () {
    this.adapter.log.debug("Fetch all params.");
    const categories = this.categories;
    return new Promise((resolve, reject) => {
      async.map(categories, (item, reply) => {
        this.fetchParams(item.categoryId).then((result) => {
          result.forEach((i) => {
            var name = i.title;
            if ((i.designation != undefined) && (i.designation != ""))
            {
                name = i.parameterId + "_" + name + "_" + i.designation;
            }
            name = (name.split(/[^a-z0-9]+/gi).join('_')).toUpperCase().replace(/[_]+$/, '');
            const parameters = this.options.parameters[i.parameterId];
            Object.assign(i, {
              key: name,
              categoryId: item.categoryId,
              categoryName: item.name
            }, parameters)

            if (i.divideBy > 0)
            {
              i.value = i.rawValue / i.divideBy;
            }
            else
            {
              i.value = i.rawValue;
            }
          })
          reply(null, result)
        }, (error) => {
          reply(error);
        })
      }, (error, results) => {
        if (error)
          return reject(error);
        results = [].concat.apply([], results);
        this._onData(results);
        resolve(results);
      })
    })
  }

  readSession () {
    this.adapter.log.debug("Read session.");
    if (!this.options.sessionStore || !fs.existsSync(this.options.sessionStore))
      return;
    this._auth = jsonfile.readFileSync(this.options.sessionStore, { throws: false });
  }

  getSession (key) {
    this.adapter.log.debug("Get session.");
    if (this._auth == null)
      this.readSession();
    return this._auth ? this._auth[key] : null;
  }

  setSesssion (auth) {
    this.adapter.log.debug("Set session.");
    this._auth = auth;
    if (!this.options.sessionStore)
      return;
    jsonfile.writeFileSync(this.options.sessionStore, this._auth, { spaces: 2 });
  }

  _isTokenExpired () {
    this.adapter.log.debug("Is token expired?");
    var expired = (this.getSession('expires_at') || 0) < (Date.now() + this.options.renewBeforeExpiry);
    this.adapter.log.debug("Is token expired: " + expired);
    return expired;
  }

  _hasRefreshToken () {
    this.adapter.log.debug("Has refresh token?");
    var hasToken = !!this.getSession('refresh_token');
    this.adapter.log.debug("Has refresh token: " + hasToken);
    return hasToken;
  }

  _onData (data) {
    this.emit('data', data);
  }

  _onError (error) {
    this.emit('error', error);
  }

  _isError (response) {
    if ((typeof(response) !== 'undefined') && (response !== null) && (response.statusCode !== 200)) {
      this.adapter.log.error('Error occurred: ' + response.statusCode + ': ' + response.statusMessage);
      if (response.statusCode === 401)
        this.clear();
      return true;
    }

    return false;
  }
}

module.exports = Fetcher;
