const EventEmitter = require('events')
const Hoek = require('hoek')
const Wreck = require('wreck')
const Joi = require('joi')
const querystring = require('querystring')
const async = require('async')
const info = require('./package.json')
const jsonfile = require('jsonfile')
jsonfile.spaces = 2
const Path = require('path')
const fs = require('fs')

const defaultOptions = {
  clientId: null,
  clientSecret: null,
  systemId: null,
  pattern: /<tr>\s*<td>\s*([^<]+)<span[^>]+>([^<]*)<\/span>\s*<\/td>\s*<td>\s*<span class="AutoUpdateValue ID([0-9]*)[^>]+>([^<]*)<\/span>\s*<\/td>\s*<\/tr>/g,
  baseUrl: 'https://api.nibeuplink.com',
  redirectUri: 'http://z0mt3c.github.io/nibe.html',
  scope: 'READSYSTEM',
  autoStart: true,
  timeout: 60000,
  maxBytes: 1048576,
  followRedirects: 2,
  userAgent: [info.name, info.version].join(' '),
  parameters: {
    '10001': {
      'key': 'ventilation_fan_speed',
      'divideBy': 0
    },
    '10012': {
      'key': 'cpr_info_ep14_blocked',
      'divideBy': 0
    },
    '10033': {
      'key': 'addition_blocked',
      'divideBy': 0
    },
    '40004': {
      'key': 'status_outdoor_temp',
      'divideBy': 10
    },
    '40008': {
      'key': 'system_1_heat_medium_flow',
      'divideBy': 10
    },
    '40012': {
      'key': 'cpr_info_ep14_condenser_return',
      'divideBy': 10
    },
    '40013': {
      'key': 'status_hot_water_top',
      'divideBy': 10
    },
    '40014': {
      'key': 'status_hot_water_charging',
      'divideBy': 10
    },
    '40015': {
      'key': 'brine_in',
      'divideBy': 10
    },
    '40016': {
      'key': 'brine_out',
      'divideBy': 10
    },
    '40017': {
      'key': 'cpr_info_ep14_condenser_out',
      'divideBy': 10
    },
    '40018': {
      'key': 'cpr_info_ep14_hot_gas',
      'divideBy': 10
    },
    '40019': {
      'key': 'cpr_info_ep14_liquid_line',
      'divideBy': 10
    },
    '40020': {
      'key': 'cpr_info_ep14_evaporator',
      'divideBy': 10
    },
    '40022': {
      'key': 'cpr_info_ep14_suction_gas',
      'divideBy': 10
    },
    '40025': {
      'key': 'ventilation_exhaust_air',
      'divideBy': 10
    },
    '40026': {
      'key': 'ventilation_extract_air',
      'divideBy': 10
    },
    '40033': {
      'key': 'system_1_room_temperature',
      'divideBy': 10
    },
    '40067': {
      'key': 'status_avg_outdoor_temp',
      'divideBy': 10
    },
    '40071': {
      'key': 'system_1_external_flow_temp'
    },
    '40072': {
      'key': 'heat_meter_flow',
      'divideBy': 10
    },
    '40101': {
      'key': 'outdoor_air_mix_incoming_air_temp',
      'divideBy': 10
    },
    '40919': {
      'key': 'outdoor_air_mix_status',
      'divideBy': 0
    },
    '41026': {
      'key': 'defrosting_value_air_velocity_sensor',
      'divideBy': 10
    },
    '43005': {
      'key': 'status_degree_minutes',
      'divideBy': 10
    },
    '43009': {
      'key': 'system_1_calculated_flow_temp',
      'divideBy': 10
    },
    '43081': {
      'key': 'addition_time_factor',
      'divideBy': 10
    },
    '43084': {
      'key': 'addition_electrical_addition_power',
      'divideBy': 10
    },
    '43123': {
      'key': 'cpr_info_ep14_allowed_compr_freq',
      'divideBy': 0
    },
    '43124': {
      'key': 'defrosting_reference_air_velocity_sensor',
      'divideBy': 10
    },
    '43125': {
      'key': 'defrosting_decrease_from_reference',
      'divideBy': 10
    },
    '43136': {
      'key': 'cpr_info_ep14_current_compr_frequency',
      'divideBy': 10
    },
    '43161': {
      'key': 'system_1_external_adjustment',
      'divideBy': 0
    },
    '43416': {
      'key': 'cpr_info_ep14_compressor_starts',
      'divideBy': 0
    },
    '43420': {
      'key': 'cpr_info_ep14_compressor_operating_time',
      'divideBy': 0
    },
    '43424': {
      'key': 'cpr_info_ep14_compressor_operating_time_hot_water',
      'divideBy': 0
    },
    '43437': {
      'key': 'cpr_info_ep14_pump_speed_heating_medium',
      'divideBy': 0
    },
    '44298': {
      'key': 'heat_meter_hw_incl_int_add',
      'divideBy': 10
    },
    '44300': {
      'key': 'heat_meter_heating_int_add_incl',
      'divideBy': 10
    },
    '44306': {
      'key': 'heat_meter_hotwater_compr_only',
      'divideBy': 10
    },
    '44308': {
      'key': 'heat_meter_heating_compr_only',
      'divideBy': 10
    },
    '47212': {
      'key': 'addition_set_max_electrical_add',
      'divideBy': 100
    },
    '47214': {
      'key': 'addition_fuse_size'
    },
    '47407': {
      'key': 'aux_in_out_aux_1',
      'divideBy': 0
    },
    '47408': {
      'key': 'aux_in_out_aux_2'
    },
    '47409': {
      'key': 'aux_in_out_aux_3'
    },
    '47410': {
      'key': 'aux_in_out_aux_4',
      'divideBy': 0
    },
    '47411': {
      'key': 'aux_in_out_aux_5',
      'divideBy': 0
    },
    '47412': {
      'key': 'aux_in_out_x',
      'divideBy': 0
    },
    '48745': {
      'key': 'system_info_country'
    }
  },
  interval: 15,
  timezone: 'Europe/Berlin',
  renewBeforeExpiry: 5 * 60 * 1000,
  sessionStore: Path.join(__dirname, './.session.json')
}

class Fetcher extends EventEmitter {
  constructor (options) {
    super()

    Joi.assert(options, Joi.object({
      clientId: Joi.string().length(32).required(),
      clientSecret: Joi.string().required(),
      systemId: Joi.number().required()
    }).options({ allowUnknown: true }))

    this.options = Hoek.applyToDefaults(defaultOptions, options || {})

    this.wreck = Wreck.defaults({
      baseUrl: this.options.baseUrl,
      headers: { 'user-agent': this.options.userAgent },
      redirects: this.options.followRedirects,
      timeout: this.options.timeout,
      maxBytes: this.options.maxBytes
    })

    if (process.env.NIBE_AUTH_CODE) this.options.authCode = process.env.NIBE_AUTH_CODE
    if (this.options.autoStart) this.start()
  }

  fetch (callback) {
    async.waterfall([
      (callback) => {
        if (this._hasRefreshToken()) return callback()
        if (this.options.authCode) {
          this.token(this.options.authCode)
            .then((data) => callback(), (error) => callback(error))
          return
        } else {
          const query = {
            response_type: 'code',
            client_id: this.options.clientId,
            scope: this.options.scope,
            redirect_uri: this.options.redirectUri,
            state: 'init'
          }

          console.log('Open in webbrowser to receive your NIBE Uplink Auth-Code:')
          console.log('')
          console.log(this.options.baseUrl + '/oauth/authorize?' + querystring.stringify(query))
          console.log('')
          console.log('Afterwards make sure to provide the NIBE Uplink Auth-Code as environment property NIBE_AUTH_CODE and restart the process.')
          this.stop()
        }
      },
      (callback) => {
        if (!this._isTokenExpired()) return callback()
        console.log('Token is expired / expires soon - refreshing')
        this.refreshToken().then((data) => callback(), (error) => callback(error))
      },
      (callback) => {
        if (this.categories != null) return callback()
        console.log('Loading categories')
        this.fetchCategories().then((data) => {
          callback()
        }, (error) => {
          callback(error)
        })
      },
      (callback) => {
        this.fetchAllParams().then((data) => {
          callback()
        }, (error) => {
          callback(error)
        })
      }
    ], (error) => {
      if (error) {
        this._onError(error)
      }

      callback()
    })
  }

  start () {
    if (this._interval) return
    var active = false

    var exec = () => {
      if (active) return
      active = true
      this.fetch(() => {
        active = false
      })
    }

    this._interval = setInterval(exec, this.options.interval * 1000)
    exec()
  }

  stop () {
    if (!this._interval) return
    clearInterval(this._interval)
    this._interval = null
  }

  clear () {
    this.setSesssion({})
  }

  token (code) {
    const data = {
      grant_type: 'authorization_code',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: code,
      redirect_uri: this.options.redirectUri,
      scope: this.options.scope
    }

    return new Promise((resolve, reject) => {
      this.wreck.post('/oauth/token', {
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        json: true,
        payload: querystring.stringify(data)
      }, (error, response, payload) => {
        if (error) return reject(error)
        if (this._isError(response)) return reject(new Error(response.statusCode + ': ' + response.statusMessage))
        payload.expires_at = Date.now() + (payload.expires_in * 1000)
        this.setSesssion(payload)
        this.setSesssion(payload)
        return resolve(payload)
      })
    })
  }

  refreshToken () {
    const data = {
      grant_type: 'refresh_token',
      refresh_token: this.getSession('refresh_token'),
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret
    }

    return new Promise((resolve, reject) => {
      this.wreck.post('/oauth/token', {
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        json: true,
        payload: querystring.stringify(data)
      }, (error, response, payload) => {
        if (error) return reject(error)
        if (this._isError(response)) return reject(new Error(response.statusCode + ': ' + response.statusMessage))
        payload.expires_at = Date.now() + (payload.expires_in * 1000)
        this.setSesssion(payload);
        return resolve(payload);
      })
    })
  }

  fetchCategories () {
    const systemId = this.options.systemId
    return new Promise((resolve, reject) => {
      this.wreck.get(`/api/v1/systems/${systemId}/serviceinfo/categories`, {
        headers: {
          Authorization: 'Bearer ' + this.getSession('access_token')
        },
        json: true
      }, (error, response, payload) => {
        if (error) return reject(error)
        if (this._isError(response)) return reject(new Error(response.statusCode + ': ' + response.statusMessage))
        this.categories = payload
        return resolve(payload)
      })
    })
  }

  fetchParams (category) {
    const systemId = this.options.systemId
    return new Promise((resolve, reject) => {
      this.wreck.get(`/api/v1/systems/${systemId}/serviceinfo/categories/status?categoryId=${category}`, {
        headers: {
          Authorization: 'Bearer ' + this.getSession('access_token')
        },
        json: true
      }, (error, response, payload) => {
        if (error) return reject(error)
        if (this._isError(response)) return reject(new Error(response.statusCode + ': ' + response.statusMessage))
        return resolve(payload)
      })
    })
  }

  fetchAllParams () {
    const categories = this.categories
    return new Promise((resolve, reject) => {
      async.map(categories, (item, reply) => {
        this.fetchParams(item.categoryId).then((result) => {
          result.forEach((i) => {
            const name = i.parameterId || (item.categoryId + '_' + i.title.split(/[^a-z]+/gi).join('_')).toLowerCase().replace(/[_]+$/, '')
            const parameters = this.options.parameters[name]
            Object.assign(i, {
              key: name,
              categoryId: item.categoryId
            }, parameters)

            if (i.divideBy > 0) i.value = i.rawValue / i.divideBy
          })
          reply(null, result)
        }, (error) => {
          reply(error)
        })
      }, (error, results) => {
        if (error) return reject(error)
        results = [].concat.apply([], results)
        this._onData(results)
        resolve(results)
      })
    })
  }

  readSession () {
    if (!this.options.sessionStore || !fs.existsSync(this.options.sessionStore)) return
    this._auth = jsonfile.readFileSync(this.options.sessionStore, { throws: false })
  }

  getSession (key) {
    if (this._auth == null) this.readSession()
    return this._auth ? this._auth[key] : null
  }

  setSesssion (auth) {
    this._auth = auth
    if (!this.options.sessionStore) return
    jsonfile.writeFileSync(this.options.sessionStore, this._auth)
  }

  _isTokenExpired () {
    return (this.getSession('expires_at') || 0) < (Date.now() + this.options.renewBeforeExpiry)
  }

  _hasRefreshToken () {
    return !!this.getSession('refresh_token')
  }

  _onData (data) {
    this.emit('data', data)
  }

  _onError (error) {
    this.emit('error', error)
  }

  _isError (response) {
    if (response.statusCode !== 200) {
      console.error('Error occurred: ' + response.statusCode + ': ' + response.statusMessage)
      if (response.statusCode === 401) this.clear()
      return true
    }

    return false
  }
}

module.exports = Fetcher
