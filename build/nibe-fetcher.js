"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const eventEmitter = __importStar(require("events"));
const fs = __importStar(require("fs"));
const jsonfile_1 = __importDefault(require("jsonfile"));
const parameters = __importStar(require("./parameters"));
const consts = {
    baseUrl: 'https://api.nibeuplink.com',
    scope: 'READSYSTEM WRITESYSTEM',
    timeout: 45000,
    userAgent: 'iobroker.nibeuplink',
    renewBeforeExpiry: 5 * 60 * 1000,
    parameters: parameters.NibeParameters,
};
const versionKeys = ['VERSIO', 'VERSIE', 'VARIANTA', 'WERSJA', 'VERSJON'];
const serialNumberKeys = ['SERIENNUMMER', 'SERIENUMMER', 'NUMER_SERYJNY', 'NUM_RO_DE_S_RIE', 'SARJANUMERO', 'S_RIOV_SLO'];
const productKeys = ['PRODUKT', 'PRODUIT', 'TUOTE', 'V_ROBEK'];
Array.prototype.inPartsOf = function (number) {
    const parts = Math.floor(this.length / number); // number of parts - 1
    const lastLength = this.length % number;
    const result = [];
    for (let i = 0; i < parts; i++) {
        const start = i * number;
        const part = this.slice(start, start + number);
        result.push(part);
    }
    if (lastLength > 0) {
        const lastPart = this.slice(parts * number);
        result.push(lastPart);
    }
    return result;
};
function getProperty(obj, propertyName) {
    return obj[propertyName];
}
function groupBy(list, getKey) {
    return list.reduce((previous, currentItem) => {
        const group = getKey(currentItem);
        if (!previous[group])
            previous[group] = [];
        previous[group].push(currentItem);
        return previous;
    }, {});
}
/**
 * Parse the string as int to number. If it is NaN, it returns the default value.
 * If the default value is not given, it is 0.
 * @param str The string to parse.
 * @param def The default value. The default default value is 0.
 * @returns The parsed number or the default value if the parse result is NaN.
 */
function parseIntOrDefault(str, def = 0) {
    const num = parseInt(str);
    if (isNaN(num)) {
        return def;
    }
    else {
        return num;
    }
}
class Fetcher extends eventEmitter.EventEmitter {
    constructor(options, adapter) {
        super();
        this.adapter = adapter;
        this.options = options;
        axios_1.default.defaults.baseURL = consts.baseUrl;
        axios_1.default.defaults.headers.common['user-agent'] = consts.userAgent;
        axios_1.default.defaults.timeout = consts.timeout;
        this.start();
    }
    start() {
        if (this.interval != null) {
            return;
        }
        this.active = false;
        const exec = () => {
            if (this.active) {
                return;
            }
            this.active = true;
            this.fetch().then(() => {
                this.active = false;
            });
        };
        this.interval = setInterval(exec, this.options.interval * 1000);
        exec();
    }
    stop() {
        if (this.interval == null) {
            return;
        }
        clearInterval(this.interval);
        this.interval = null;
    }
    async fetch() {
        this.adapter.log.debug('Fetch data.');
        try {
            if (this.hasNewAuthCode()) {
                this.clearSesssion();
            }
            if (!this.hasRefreshToken()) {
                if (this.options.authCode) {
                    const token = await this.getToken(this.options.authCode);
                    this.setSesssion(token);
                }
                else {
                    this.adapter.log.error('You need to get and set a new Auth-Code. You can do this in the adapter setting.');
                    this.stop();
                    return;
                }
            }
            if (this.isTokenExpired()) {
                this.adapter.log.debug('Token is expired / expires soon - refreshing');
                const token = await this.getRefreshToken();
                this.setSesssion(token);
            }
            // await this._getAndWriteAllParameters();
            if (this.units == null) {
                this.units = await this.fetchUnits();
            }
            const unitData = await Promise.all(this.units.map(async (unit) => {
                const categories = await this.fetchCategories(unit);
                const newUnit = {
                    systemUnitId: unit.systemUnitId,
                    name: unit.name,
                    shortName: unit.shortName,
                    product: unit.product,
                    softwareVersion: unit.softwareVersion,
                    categories: categories,
                };
                return newUnit;
            }));
            const allData = {
                unitData: unitData,
            };
            if (this.options.enableManage == true && this.options.managedParameters != null && this.options.managedParameters.length > 0) {
                const parametersByUnit = groupBy(this.options.managedParameters, (x) => x.unit);
                const parametersGroups = Object.values(parametersByUnit);
                const allManageData = await Promise.all(parametersGroups.map(async (group) => {
                    const unit = group[0].unit;
                    const parameters = group.map((x) => parseIntOrDefault(x.parameter));
                    const result = await this.fetchParams(unit, parameters);
                    this.processParams(result);
                    const manageData = {
                        unit: unit,
                        parameters: result,
                    };
                    return manageData;
                }));
                allData.manageData = allManageData;
            }
            this.adapter.log.debug('All data fetched.');
            this._onData(allData);
        }
        catch (error) {
            this._onError(error);
        }
    }
    async getToken(authCode) {
        this.adapter.log.debug('token()');
        const data = {
            grant_type: 'authorization_code',
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            code: authCode,
            redirect_uri: this.options.redirectUri,
            scope: consts.scope,
        };
        return await this.postTokenRequest(data);
    }
    async getRefreshToken() {
        this.adapter.log.debug('Refresh token.');
        const data = {
            grant_type: 'refresh_token',
            refresh_token: this.getSession('refresh_token'),
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
        };
        return await this.postTokenRequest(data);
    }
    async postTokenRequest(body) {
        var _a;
        const stringBody = new URLSearchParams(body).toString();
        const url = '/oauth/token';
        try {
            const { data } = await axios_1.default.post(url, stringBody, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const expiresIn = (_a = data.expires_in) !== null && _a !== void 0 ? _a : 1800;
            data.expires_at = Date.now() + expiresIn * 1000;
            return data;
        }
        catch (error) {
            throw this.checkError(url, error);
        }
    }
    async fetchUnits() {
        this.adapter.log.debug('Fetch units.');
        const units = await this.getFromNibeuplink('units');
        this.adapter.log.debug(`${units.length} units fetched.`);
        return units;
    }
    async fetchCategories(unit) {
        this.adapter.log.debug('Fetch categories.');
        const url = `serviceinfo/categories?parameters=true&systemUnitId=${unit.systemUnitId}`;
        const categories = await this.getFromNibeuplink(url);
        categories.forEach((category) => this.processParams(category.parameters));
        this.adapter.log.debug(`${categories.length} categories fetched.`);
        return categories;
    }
    async fetchParams(unit, parameters) {
        this.adapter.log.debug(`Fetch params ${parameters} of unit ${unit}.`);
        const result = await Promise.all(parameters.inPartsOf(15).map(async (p) => {
            const paramStr = p.join('&parameterIds=');
            const url = `parameters?parameterIds=${paramStr}&systemUnitId=${unit}`;
            return await this.getFromNibeuplink(url);
        }));
        return result.flat();
    }
    async getParams(unit, parameters) {
        const result = await this.fetchParams(unit, parameters);
        this.processParams(result);
        const manageData = {
            unit: unit,
            parameters: result,
        };
        const data = {
            unitData: [],
            manageData: [manageData],
        };
        this.adapter.log.debug('New data fetched.');
        this._onData(data);
    }
    async setParams(unit, parameters) {
        const url = `parameters?systemUnitId=${unit}`;
        await this.putToNibeuplink(url, { settings: parameters });
    }
    async getFromNibeuplink(suburl, lang = '') {
        if (lang == '') {
            lang = this.options.language;
        }
        const systemId = this.options.systemId;
        const url = `/api/v1/systems/${systemId}/${suburl}`;
        this.adapter.log.debug(`GET ${url} (lang: ${lang})`);
        try {
            const { data } = await axios_1.default.get(url, {
                headers: {
                    Authorization: 'Bearer ' + this.getSession('access_token'),
                    'Accept-Language': lang,
                },
            });
            return data;
        }
        catch (error) {
            throw this.checkError(suburl, error);
        }
    }
    async putToNibeuplink(suburl, body, lang = '') {
        if (lang == '') {
            lang = this.options.language;
        }
        const systemId = this.options.systemId;
        const url = `/api/v1/systems/${systemId}/${suburl}`;
        this.adapter.log.debug(`PUT ${url} (lang: ${lang})`);
        this.adapter.log.silly(`PUT body: ${JSON.stringify(body, null, ' ')}`);
        try {
            await axios_1.default.put(url, body, {
                headers: {
                    Authorization: 'Bearer ' + this.getSession('access_token'),
                    'Accept-Language': lang,
                },
            });
        }
        catch (error) {
            throw this.checkError(suburl, error);
        }
    }
    checkError(suburl, error) {
        this.adapter.log.error(`error from ${suburl}`);
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.response != null) {
                if (axiosError.response.status == 401) {
                    this.clearSesssion();
                }
                if (axiosError.response.data != null) {
                    const responseText = JSON.stringify(axiosError.response.data, null, ' ');
                    const errorMessage = `${axiosError.response.statusText}: ${responseText}`;
                    return new Error(errorMessage);
                }
                else {
                    return new Error(axiosError.response.statusText);
                }
            }
        }
        return error;
    }
    processParams(params, collect = false) {
        params.forEach((item) => {
            const parameters = consts.parameters.get(item.parameterId);
            if (parameters == null) {
                let key = item.title;
                if (!collect && item.parameterId > 0) {
                    key = item.parameterId + '_' + key;
                }
                if (item.designation != null && item.designation != '') {
                    key = key + '_' + item.designation;
                }
                key = key
                    .toUpperCase()
                    .replace(/[^A-Z0-9_]+/gm, '_')
                    .replace(/_{2,}/gm, '_')
                    .replace(/_+$/gm, '');
                if (item.parameterId == 0) {
                    if (versionKeys.includes(key)) {
                        key = 'VERSION';
                    }
                    else if (serialNumberKeys.includes(key)) {
                        key = 'SERIAL_NUMBER';
                    }
                    else if (productKeys.includes(key)) {
                        key = 'PRODUCT';
                    }
                }
                Object.assign(item, { key: key });
            }
            else {
                Object.assign(item, parameters);
            }
            if (item.divideBy == null) {
                if (item.unit == '°C' || item.unit == 'kW' || item.unit == 'kWh' || item.unit == 'l/m') {
                    Object.assign(item, { divideBy: 10 });
                }
            }
            if (item.divideBy != null && item.divideBy > 0) {
                item.value = item.rawValue / item.divideBy;
            }
            else {
                item.value = item.rawValue;
            }
        });
    }
    readSession() {
        this.adapter.log.debug('Read session.');
        if (!this.options.sessionStore || !fs.existsSync(this.options.sessionStore)) {
            return;
        }
        this.auth = jsonfile_1.default.readFileSync(this.options.sessionStore, { throws: false });
    }
    getSession(key) {
        this.adapter.log.silly('Get session.');
        if (this.auth == null) {
            this.readSession();
        }
        return this.auth ? getProperty(this.auth, key) : null;
    }
    setSesssion(auth) {
        this.adapter.log.debug('Set session.');
        if (auth.authCode == null) {
            auth.authCode = this.options.authCode;
        }
        this.auth = auth;
        if (!this.options.sessionStore) {
            return;
        }
        jsonfile_1.default.writeFileSync(this.options.sessionStore, this.auth, { spaces: 2 });
    }
    clearSesssion() {
        this.adapter.log.debug('Clear session.');
        this.setSesssion({});
    }
    hasNewAuthCode() {
        const hasNewAuthCode = this.getSession('authCode') != null && this.getSession('authCode') != this.options.authCode;
        this.adapter.log.debug('Has new auth code: ' + hasNewAuthCode);
        return hasNewAuthCode;
    }
    isTokenExpired() {
        const expired = (this.getSession('expires_at') || 0) < Date.now() + consts.renewBeforeExpiry;
        this.adapter.log.debug('Is token expired: ' + expired);
        return expired;
    }
    hasRefreshToken() {
        const hasToken = !!this.getSession('refresh_token');
        this.adapter.log.debug('Has refresh token: ' + hasToken);
        return hasToken;
    }
    _onData(data) {
        this.emit('data', data);
    }
    _onError(error) {
        this.emit('error', error);
    }
}
exports.Fetcher = Fetcher;
//# sourceMappingURL=nibe-fetcher.js.map