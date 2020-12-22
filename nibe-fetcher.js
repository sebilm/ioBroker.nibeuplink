//
// nibe-fetcher
//
// original author: Timo Behrmann (timo.behrmann@gmail.com)
// changed by Sebastian Haesselbarth (seb@sebmail.de)
//
// original sources: https://github.com/z0mt3c/nibe-fetcher
//
// license: MIT
//
// this version is based on original nibe-fetcher version 1.1.0
//

const EventEmitter = require('events');
const Hoek = require('@hapi/hoek');
const Wreck = require('@hapi/wreck');
const querystring = require('querystring');
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
    '40007': {
      'key': 'HEAT_MEDIUM_FLOW_EP21_BT2',
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
    '40032': {
      'key': 'ROOM_TEMPERATURE_EP21_BT50',
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
    '40121': {
      'key': 'ADDITION_TEMPERATURE_BT63',
      'divideBy': 10
    },
    '40129': {
      'key': 'HEAT_MEDIUM_RETURN_EP21_BT3',
      'divideBy': 10
    },
    '40152': {
      'key': 'EXTERNAL_RETURN_TEMP_BT71',
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
    '43008': {
      'key': 'CALCULATED_FLOW_TEMP_S2',
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
    '43091': {
      'key': 'STATUS',
      'divideBy': 0
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
    '43160': {
      'key': 'EXTERNAL_ADJUSTMENT_S2',
      'divideBy': 0
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
    '47613': {
      'key': 'MAX_STEP',
      'divideBy': 0
    },
    '48366': {
      'key': 'AUX_6',
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

  start () {
    if (this._interval)
      return;
    var active = false;

    var exec = () => {
      if (active)
        return;
      active = true;
      this.fetch().then(() => {
        active = false;
      });
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

  async fetch()
  {
    this.adapter.log.debug("Fetch data.");
    try {
      if (!this._hasRefreshToken()) {
        if (this.options.authCode) {
          let token = await this.getToken(this.options.authCode);
          this.setSesssion(token);
        } else {
          this.adapter.log.error("You need to get and set a new Auth-Code. You can do this in the adapter setting.");
          this.stop();
          return;
        }
      }
      if (this._isTokenExpired()) {
        this.adapter.log.debug('Token is expired / expires soon - refreshing');
        let token = await this.getRefreshToken();
        this.setSesssion(token);
      }
      if (this.units == null) {
        this.units = await this.fetchUnits();
      }
      let allData = await Promise.all(this.units.map(async (unit) => {        
        let categories = await this.fetchCategories(unit);
        return Object.assign({}, unit, { categories: categories });
      }));
      this.adapter.log.debug('All data fetched.');
      this._onData(allData);
    }
    catch (error) {
      this._onError(error);
    }
  }

  async getToken (authCode) {
    this.adapter.log.debug("token()");
    const data = {
      grant_type: 'authorization_code',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: authCode,
      redirect_uri: this.options.redirectUri,
      scope: this.options.scope
    }
    return await this.postTokenRequest(data);
  }

  async getRefreshToken () {
    this.adapter.log.debug("Refresh token.");
    const data = {
      grant_type: 'refresh_token',
      refresh_token: this.getSession('refresh_token'),
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret
    }
    return await this.postTokenRequest(data);
  }

  async postTokenRequest(playload) {
    const { response, payload } = await this.wreck.post('/oauth/token', {
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      json: true,
      payload: querystring.stringify(playload)
    });
    if (this._isErrorResponse(response)) {
      throw new Error(response.statusCode + ': ' + response.statusMessage);
    }
    payload.expires_at = Date.now() + (payload.expires_in * 1000);    
    return payload;
  }

  async fetchUnits () {
    this.adapter.log.debug('Fetch units.');
    let units = await this.getFromNibeuplink('units');
    this.adapter.log.debug(`${units.length} units fetched.`);
    return units;
  }

  async fetchCategories (unit) {
    this.adapter.log.debug("Fetch categories.");
    let categories = await this.getFromNibeuplink(`serviceinfo/categories?parameters=true&systemUnitId=${unit.systemUnitId}`);
    categories.forEach(category => this.processParams(category.parameters));
    this.adapter.log.debug(`${categories.length} categories fetched.`);
    return categories;
  }

  async fetchParams (category) {
    this.adapter.log.debug(`Fetch params of category ${category}.`);
    return await this.getFromNibeuplink(`serviceinfo/categories/status?categoryId=${category}`);
  }  

  async getFromNibeuplink(suburl) {
    const systemId = this.options.systemId;
    const { response, payload } = await this.wreck.get(`/api/v1/systems/${systemId}/${suburl}`, {
      headers: {
        Authorization: 'Bearer ' + this.getSession('access_token'),
        'Accept-Language': this.options.language,
      },
      json: true
    });
    if (this._isErrorResponse(response)) {
      this.adapter.log.error(`error from ${suburl}`);
      throw new Error(response.statusCode + ': ' + response.statusMessage);
    }
    return payload;
  }

  processParams(params) {
    params.forEach((item) => {
      const parameters = this.options.parameters[item.parameterId];
      if (parameters == null) {
        let key = item.title;
        if (item.parameterId > 0) {
          key = item.parameterId + "_" + key;
        }
        if ((item.designation != null) && (item.designation != ""))
        {
            key = key + "_" + item.designation;
        }
        const regex = /[^A-Z0-9_]+/gi;
        key = key.toUpperCase().replace(regex, '_');
        Object.assign(item, { key: key });
      } else {
        Object.assign(item, parameters);
      }

      if (item.divideBy > 0)
      {
        item.value = item.rawValue / item.divideBy;
      }
      else
      {
        item.value = item.rawValue;
      }
    })
  }

  readSession () {
    this.adapter.log.debug("Read session.");
    if (!this.options.sessionStore || !fs.existsSync(this.options.sessionStore))
      return;
    this._auth = jsonfile.readFileSync(this.options.sessionStore, { throws: false });
  }

  getSession (key) {
    this.adapter.log.silly("Get session.");
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

  clearSesssion () {
    this.adapter.log.debug("Clear session.");
    this.setSesssion({});
  }

  _isTokenExpired () {
    var expired = (this.getSession('expires_at') || 0) < (Date.now() + this.options.renewBeforeExpiry);
    this.adapter.log.debug("Is token expired: " + expired);
    return expired;
  }

  _hasRefreshToken () {
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

  _isErrorResponse (response) {
    if ((response != null) && (response.statusCode !== 200)) {
      if (response.statusCode === 401) {
        this.clearSesssion();
      }
      return true;
    } else {
      return false;
    }
  }
}

module.exports = Fetcher;
