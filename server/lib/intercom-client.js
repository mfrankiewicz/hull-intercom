import request from "superagent";
import prefixPlugin from "superagent-prefix";
import superagentPromisePlugin from "superagent-promise-plugin";
import _ from "lodash";

export default class IntercomClient {

  constructor(hull, instrumentationAgent) {
    this.apiKey = _.get(hull.ship, "private_settings.api_key");
    this.appId = _.get(hull.ship, "private_settings.app_id");
    this.accessToken = _.get(hull.ship, "private_settings.access_token");
    this.hull = hull;
    this.instrumentationAgent = instrumentationAgent;

    this.req = request;
  }

  ifConfigured() {
    return (!_.isEmpty(this.apiKey) && !_.isEmpty(this.appId)) || !_.isEmpty(this.accessToken);
  }

  attach(req) {
    if (!this.ifConfigured()) {
      throw new Error("Client access data not set!");
    }

    const preparedReq = req
      .use(prefixPlugin("https://api.intercom.io"))
      .use(superagentPromisePlugin)
      .accept("application/json")
      .on("request", (reqData) => {
        console.log("REQ", reqData.method, reqData.url);
      })
      .on("response", (res) => {
        const limit = _.get(res.header, "x-ratelimit-limit");
        const remaining = _.get(res.header, "x-ratelimit-remaining");
        // const remainingSeconds = moment(_.get(res.header, "x-ratelimit-reset"), "X")
        //   .diff(moment(), "seconds");
        // x-runtime
        this.instrumentationAgent.metricInc("ship.service_api.call", 1, this.hull.client.configuration());
        if (remaining) {
          this.instrumentationAgent.metricVal("ship.service_api.remaining", remaining, this.hull.client.configuration());
        }

        if (limit) {
          this.instrumentationAgent.metricVal("ship.service_api.limit", limit, this.hull.client.configuration());
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
