import request from "superagent";
import Throttle from "superagent-throttle";
import prefixPlugin from "superagent-prefix";
import superagentPromisePlugin from "superagent-promise-plugin";
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
    this.req = request;
    this.ship = ship;
  }

  ifConfigured() {
    return (!_.isEmpty(this.apiKey) && !_.isEmpty(this.appId)) || !_.isEmpty(this.accessToken);
  }

  attach(req) {
    const throttle = getThrottle(this.ship);

    if (!this.ifConfigured()) {
      throw new Error("Client access data not set!");
    }

    const preparedReq = req
      .use(prefixPlugin(process.env.OVERRIDE_INTERCOM_URL || "https://api.intercom.io"))
      .use(superagentPromisePlugin)
      .use(throttle.plugin())
      .accept("application/json")
      .on("request", (reqData) => {
        this.client.logger.debug("intercomClient.req", { method: reqData.method, url: reqData.url });
      })
      .on("error", (error) => {
        const path = _.get(error, "response.req.path", "").split("?")[0];
        const method = _.get(error, "response.req.method");
        this.client.logger.debug("intercomClient.resError", { status: error.status, path, method });
      })
      .on("response", (res) => {
        const limit = _.get(res.header, "x-ratelimit-limit");
        const remaining = _.get(res.header, "x-ratelimit-remaining");
        this.client.logger.debug("intercomClient.ratelimit", { remaining, limit });

        this.metric.increment("ship.service_api.call", 1);
        if (remaining !== undefined) {
          this.metric.value("ship.service_api.remaining", remaining);
        }

        if (limit) {
          this.metric.value("ship.service_api.limit", limit);
        }
      });

    if (this.accessToken) {
      return preparedReq.auth(this.accessToken);
    }
    return preparedReq.auth(this.appId, this.apiKey);
  }

  get(url) {
    const req = this.req.get(url);
    return this.attach(req);
  }

  post(url) {
    const req = this.req.post(url);
    return this.attach(req);
  }

  delete(url) {
    const req = this.req.delete(url);
    return this.attach(req);
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
