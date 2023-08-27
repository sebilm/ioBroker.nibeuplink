"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var nibe_fetcher_exports = {};
__export(nibe_fetcher_exports, {
  Fetcher: () => Fetcher
});
module.exports = __toCommonJS(nibe_fetcher_exports);
var import_axios = __toESM(require("axios"));
var eventEmitter = __toESM(require("events"));
var fs = __toESM(require("fs"));
var import_jsonfile = __toESM(require("jsonfile"));
var parameters = __toESM(require("./parameters"));
const consts = {
  baseUrl: "https://api.nibeuplink.com",
  scope: "READSYSTEM WRITESYSTEM",
  timeout: 45e3,
  userAgent: "iobroker.nibeuplink",
  renewBeforeExpiry: 5 * 60 * 1e3,
  parameters: parameters.NibeParameters
};
const versionKeys = ["VERSIO", "VERSIE", "VARIANTA", "WERSJA", "VERSJON"];
const serialNumberKeys = ["SERIENNUMMER", "SERIENUMMER", "NUMER_SERYJNY", "NUM_RO_DE_S_RIE", "SARJANUMERO", "S_RIOV_SLO"];
const productKeys = ["PRODUKT", "PRODUIT", "TUOTE", "V_ROBEK"];
Array.prototype.inPartsOf = function(number) {
  const parts = Math.floor(this.length / number);
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
function groupBy(list, getKey) {
  return list.reduce((previous, currentItem) => {
    const group = getKey(currentItem);
    if (!previous[group])
      previous[group] = [];
    previous[group].push(currentItem);
    return previous;
  }, {});
}
class Fetcher extends eventEmitter.EventEmitter {
  constructor(options, adapter) {
    super();
    this.adapter = adapter;
    this.options = options;
    import_axios.default.defaults.baseURL = consts.baseUrl;
    import_axios.default.defaults.headers.common["user-agent"] = consts.userAgent;
    import_axios.default.defaults.timeout = consts.timeout;
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
    this.interval = setInterval(exec, this.options.interval * 1e3);
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
    this.adapter.log.debug("Fetch data.");
    try {
      if (this.hasNewAuthCode()) {
        this.clearSesssion();
      }
      if (!this.hasRefreshToken()) {
        if (this.options.authCode) {
          const token = await this.getToken(this.options.authCode);
          this.setSesssion(token);
        } else {
          this.adapter.log.error("You need to get and set a new Auth-Code. You can do this in the adapter setting.");
          this.stop();
          return;
        }
      }
      if (this.isTokenExpired()) {
        this.adapter.log.debug("Token is expired / expires soon - refreshing");
        const token = await this.getRefreshToken();
        this.setSesssion(token);
      }
      if (this.units == null) {
        this.units = await this.fetchUnits();
      }
      const unitData = await Promise.all(
        this.units.map(async (unit) => {
          const categories = await this.fetchCategories(unit);
          const newUnit = {
            systemUnitId: unit.systemUnitId,
            name: unit.name,
            shortName: unit.shortName,
            product: unit.product,
            softwareVersion: unit.softwareVersion,
            categories
          };
          return newUnit;
        })
      );
      const allData = {
        unitData
      };
      if (this.options.enableManage == true && this.options.managedParameters != null && this.options.managedParameters.length > 0) {
        const parametersByUnit = groupBy(this.options.managedParameters, (x) => x.unit);
        const parametersGroups = Object.values(parametersByUnit);
        const allManageData = await Promise.all(
          parametersGroups.map(async (group) => {
            const unit = group[0].unit;
            const parameters2 = group.map((x) => x.parameter);
            const result = await this.fetchParams(unit, parameters2);
            this.processParams(result);
            const manageData = {
              unit,
              parameters: result
            };
            return manageData;
          })
        );
        allData.manageData = allManageData;
      }
      this.adapter.log.debug("All data fetched.");
      this._onData(allData);
    } catch (error) {
      this._onError(error);
    }
  }
  async getToken(authCode) {
    this.adapter.log.debug("token()");
    const data = {
      grant_type: "authorization_code",
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: authCode,
      redirect_uri: this.options.redirectUri,
      scope: consts.scope
    };
    return await this.postTokenRequest(data);
  }
  async getRefreshToken() {
    this.adapter.log.debug("Refresh token.");
    const data = {
      grant_type: "refresh_token",
      refresh_token: this.getSessionRefreshToken(),
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret
    };
    return await this.postTokenRequest(data);
  }
  async postTokenRequest(body) {
    var _a;
    const stringBody = new URLSearchParams(body).toString();
    const url = "/oauth/token";
    try {
      const { data } = await import_axios.default.post(url, stringBody, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const expiresIn = (_a = data.expires_in) != null ? _a : 1800;
      data.expires_at = Date.now() + expiresIn * 1e3;
      return data;
    } catch (error) {
      throw this.checkError(url, error);
    }
  }
  async fetchUnits() {
    this.adapter.log.debug("Fetch units.");
    const units = await this.getFromNibeuplink("units");
    this.adapter.log.debug(`${units.length} units fetched.`);
    return units;
  }
  async fetchCategories(unit) {
    this.adapter.log.debug("Fetch categories.");
    const url = `serviceinfo/categories?parameters=true&systemUnitId=${unit.systemUnitId}`;
    const categories = await this.getFromNibeuplink(url);
    categories.forEach((category) => this.processParams(category.parameters));
    this.adapter.log.debug(`${categories.length} categories fetched.`);
    return categories;
  }
  async fetchParams(unit, parameters2) {
    this.adapter.log.debug(`Fetch params ${parameters2} of unit ${unit}.`);
    const result = await Promise.all(
      parameters2.inPartsOf(15).map(async (p) => {
        const paramStr = p.join("&parameterIds=");
        const url = `parameters?parameterIds=${paramStr}&systemUnitId=${unit}`;
        return await this.getFromNibeuplink(url);
      })
    );
    return result.flat();
  }
  async getParams(unit, parameters2) {
    const result = await this.fetchParams(unit, parameters2);
    this.processParams(result);
    const manageData = {
      unit,
      parameters: result
    };
    const data = {
      unitData: [],
      manageData: [manageData]
    };
    this.adapter.log.debug("New data fetched.");
    this._onData(data);
  }
  async setParams(unit, parameters2) {
    const url = `parameters?systemUnitId=${unit}`;
    await this.putToNibeuplink(url, { settings: parameters2 });
  }
  async getFromNibeuplink(suburl, lang = "") {
    if (lang == "") {
      lang = this.options.language;
    }
    const systemId = this.options.systemId;
    const url = `/api/v1/systems/${systemId}/${suburl}`;
    this.adapter.log.debug(`GET ${url} (lang: ${lang})`);
    try {
      const { data } = await import_axios.default.get(url, {
        headers: {
          Authorization: "Bearer " + this.getSessionAccessToken(),
          "Accept-Language": lang
        }
      });
      return data;
    } catch (error) {
      throw this.checkError(suburl, error);
    }
  }
  async putToNibeuplink(suburl, body, lang = "") {
    if (lang == "") {
      lang = this.options.language;
    }
    const systemId = this.options.systemId;
    const url = `/api/v1/systems/${systemId}/${suburl}`;
    this.adapter.log.debug(`PUT ${url} (lang: ${lang})`);
    this.adapter.log.silly(`PUT body: ${JSON.stringify(body, null, " ")}`);
    try {
      await import_axios.default.put(url, body, {
        headers: {
          Authorization: "Bearer " + this.getSessionAccessToken(),
          "Accept-Language": lang
        }
      });
    } catch (error) {
      throw this.checkError(suburl, error);
    }
  }
  checkError(suburl, error) {
    this.adapter.log.error(`error from ${suburl}`);
    if (import_axios.default.isAxiosError(error)) {
      const axiosError = error;
      if (axiosError.response != null) {
        if (axiosError.response.status == 401) {
          this.clearSesssion();
        }
        if (axiosError.response.data != null) {
          const responseText = JSON.stringify(axiosError.response.data, null, " ");
          const errorMessage = `${axiosError.response.statusText}: ${responseText}`;
          return new Error(errorMessage);
        } else {
          return new Error(axiosError.response.statusText);
        }
      }
    }
    return error;
  }
  processParams(params, collect = false) {
    params.forEach((item) => {
      const parameters2 = consts.parameters.get(item.parameterId);
      if (parameters2 == null) {
        let key = item.title;
        if (!collect && item.parameterId > 0) {
          key = item.parameterId + "_" + key;
        }
        if (item.designation != null && item.designation != "") {
          key = key + "_" + item.designation;
        }
        key = key.toUpperCase().replace(/[^A-Z0-9_]+/gm, "_").replace(/_{2,}/gm, "_").replace(/_+$/gm, "");
        if (item.parameterId == 0) {
          if (versionKeys.includes(key)) {
            key = "VERSION";
          } else if (serialNumberKeys.includes(key)) {
            key = "SERIAL_NUMBER";
          } else if (productKeys.includes(key)) {
            key = "PRODUCT";
          }
        }
        Object.assign(item, { key });
      } else {
        Object.assign(item, parameters2);
      }
      if (item.divideBy == null) {
        if (item.unit == "\xB0C" || item.unit == "kW" || item.unit == "kWh" || item.unit == "l/m") {
          Object.assign(item, { divideBy: 10 });
        }
      }
      if (item.divideBy != null && item.divideBy > 0) {
        item.value = item.rawValue / item.divideBy;
      } else {
        item.value = item.rawValue;
      }
    });
  }
  readSession() {
    this.adapter.log.debug("Read session.");
    if (!this.options.sessionStore || !fs.existsSync(this.options.sessionStore)) {
      return;
    }
    this.auth = import_jsonfile.default.readFileSync(this.options.sessionStore, { throws: false });
  }
  getSessionAuthCode() {
    this.adapter.log.silly("Get session authCode.");
    if (this.auth == null) {
      this.readSession();
    }
    return this.auth ? this.auth.authCode : null;
  }
  getSessionAccessToken() {
    this.adapter.log.silly("Get session access_token.");
    if (this.auth == null) {
      this.readSession();
    }
    return this.auth ? this.auth.access_token : null;
  }
  getSessionRefreshToken() {
    this.adapter.log.silly("Get session refresh_token.");
    if (this.auth == null) {
      this.readSession();
    }
    return this.auth ? this.auth.refresh_token : null;
  }
  getSessionExpires() {
    this.adapter.log.silly("Get session expires.");
    if (this.auth == null) {
      this.readSession();
    }
    return this.auth ? this.auth.expires_at : null;
  }
  setSesssion(auth) {
    this.adapter.log.debug("Set session.");
    if (auth.authCode == null) {
      auth.authCode = this.options.authCode;
    }
    this.auth = auth;
    if (!this.options.sessionStore) {
      return;
    }
    import_jsonfile.default.writeFileSync(this.options.sessionStore, this.auth, { spaces: 2 });
  }
  clearSesssion() {
    this.adapter.log.debug("Clear session.");
    this.setSesssion({});
  }
  hasNewAuthCode() {
    const authCode = this.getSessionAuthCode();
    const hasNewAuthCode = authCode != null && authCode != this.options.authCode;
    this.adapter.log.debug("Has new auth code: " + hasNewAuthCode);
    return hasNewAuthCode;
  }
  isTokenExpired() {
    const expired = (this.getSessionExpires() || 0) < Date.now() + consts.renewBeforeExpiry;
    this.adapter.log.debug("Is token expired: " + expired);
    return expired;
  }
  hasRefreshToken() {
    const hasToken = !!this.getSessionRefreshToken();
    this.adapter.log.debug("Has refresh token: " + hasToken);
    return hasToken;
  }
  _onData(data) {
    this.emit("data", data);
  }
  _onError(error) {
    this.emit("error", error);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fetcher
});
//# sourceMappingURL=nibe-fetcher.js.map
