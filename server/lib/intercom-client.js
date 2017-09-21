import superagent from "superagent";
import Throttle from "superagent-throttle";
import prefixPlugin from "superagent-prefix";
import _ from "lodash";

const THROTTLES = {};

function getThrottle(ship) {
  const key = ship.id;
  if (THROTTLES[key]) return THROTTLES[key];
  const throttle = new Throttle({
    active: true,
    rate: parseInt(process.env.THROTTLE_RATE || 80, 10),
    ratePer: 10000,
    concurrent: parseInt(process.env.THROTTLE_CONCURRENT || 10, 10)
  });
  THROTTLES[key] = throttle;
  return throttle;
}

export default class IntercomClient {

  constructor({ ship, client, metric }) {
    this.apiKey = _.get(ship, "private_settings.api_key");
    this.appId = _.get(ship, "private_settings.app_id");
    this.accessToken = _.get(ship, "private_settings.access_token");
    this.client = client;
    this.metric = metric;
    this.ship = ship;
  }

  ifConfigured() {
    return (!_.isEmpty(this.apiKey) && !_.isEmpty(this.appId)) || !_.isEmpty(this.accessToken);
  }

  exec = (method, path, params = {}) => {
    const throttle = getThrottle(this.ship);

    if (!this.ifConfigured()) {
      throw new Error("Client access data not set!");
    }

    const req = superagent[method](path);
    req.use(prefixPlugin(process.env.OVERRIDE_INTERCOM_URL || "https://api.intercom.io"));
    req.accept("application/json");
    req.timeout(60000);
    req.retry(2);
    req.on("request", (reqData) => {
      this.client.logger.debug("intercomClient.req", { method: reqData.method, url: reqData.url });
    });
    req.on("error", (error) => {
      this.client.logger.debug("intercomClient.resError", { status: error.status, path, method });
    });
    req.on("response", (res) => {
      const limit = _.get(res.header, "x-ratelimit-limit");
      const remaining = _.get(res.header, "x-ratelimit-remaining");
      const reset = _.get(res.header, "x-ratelimit-reset");
      this.metric.increment("ship.service_api.call", 1);
      if (remaining !== undefined) {
        this.client.logger.debug("intercomClient.ratelimit", { remaining, limit, reset });
        this.metric.value("ship.service_api.remaining", remaining);
      }

      if (limit) {
        this.metric.value("ship.service_api.limit", limit);
      }
    });

    if (this.accessToken) {
      req.auth(this.accessToken);
    } else {
      req.auth(this.appId, this.apiKey);
    }

    if (method === "get" && params) {
      req.query(params);
    } else if (params) {
      req.send(params);
    }

    req.use(throttle.plugin(this.ship.id));

    return new Promise((resolve, reject) => {
      req.end((err, response) => {
        if (err) {
          err.response = response;
          return reject(err);
        }
        return resolve(response);
      });
    });
  }

  get(url, query) {
    return this.exec("get", url, query);
  }

  post(url, params) {
    return this.exec("post", url, params);
  }

  delete(url, params) {
    return this.exec("delete", url, params);
  }

  handleError(err) {
    const filteredError = new Error(err.message);
    filteredError.stack = err.stack;
    filteredError.req = {
      url: _.get(err, "response.request.url"),
      method: _.get(err, "response.request.method"),
      data: _.get(err, "response.request._data")
    };
    filteredError.body = _.get(err, "response.body");
    filteredError.statusCode = _.get(err, "response.statusCode");
    return filteredError;
  }

}
