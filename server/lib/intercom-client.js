const superagent = require("superagent");
const Throttle = require("superagent-throttle");
const prefixPlugin = require("superagent-prefix");
const _ = require("lodash");

const { superagentUrlTemplatePlugin, superagentInstrumentationPlugin } = require("hull/lib/utils");
const superagentErrorPlugin = require("hull/lib/utils/superagent-error-plugin");
const { ConfigurationError, RateLimitError } = require("hull/lib/errors");

const THROTTLES = {};

function getThrottle(ship) {
  const key = ship.id;
  if (THROTTLES[key]) return THROTTLES[key];
  const throttle = new Throttle({
    active: true,
    rate: parseInt(process.env.THROTTLE_RATE || 80, 10),
    ratePer: parseInt(process.env.THROTTLE_PER_RATE || 10500, 10),
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
    req.use(superagentErrorPlugin({ timeout: 60000 }));
    req.ok((res) => {
      if (res.status === 401) {
        throw new ConfigurationError(res.text);
      }
      if (res.status === 429) {
        throw new RateLimitError(res.text);
      }
      return res.status < 400;
    });
    req.on("response", (res) => {
      const limit = _.get(res.header, "x-ratelimit-limit");
      const remaining = _.get(res.header, "x-ratelimit-remaining");
      const reset = _.get(res.header, "x-ratelimit-reset");
      if (remaining !== undefined) {
        this.client.logger.debug("intercomClient.ratelimit", {
          remaining, limit, reset
        });
        this.metric.value("ship.service_api.remaining", remaining);
      }

      if (limit !== undefined) {
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

    req.use(throttle.plugin());
    req.use(superagentUrlTemplatePlugin());
    req.use(superagentInstrumentationPlugin({ logger: this.client.logger, metric: this.metric }));

    return req;
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

  handleError(err) { // eslint-disable-line class-methods-use-this
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
