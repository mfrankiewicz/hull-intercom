import request from "superagent";
import prefixPlugin from "superagent-prefix";
import superagentPromisePlugin from "superagent-promise-plugin";
import JSONStream from "JSONStream";
import tar from "tar-stream";
import zlib from "zlib";
import es from "event-stream";
import _ from "lodash";
import moment from "moment";

export default class IntercomClient {

  constructor(ship, instrumentationAgent) {
    this.apiKey = _.get(ship, "private_settings.api_key");
    this.appId = _.get(ship, "private_settings.app_id");
    this.accessToken = _.get(ship, "private_settings.access_token");
    this.ship = ship;
    this.instrumentationAgent = instrumentationAgent;

    this.req = request;
  }

  attach(req) {
    if ((_.isEmpty(this.apiKey) || _.isEmpty(this.appId)) && _.isEmpty(this.accessToken)) {
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
        this.instrumentationAgent.metricInc("api_call", 1, this.ship);
        this.instrumentationAgent.metricVal("ratelimit_remaining", remaining, this.ship);
        this.instrumentationAgent.metricVal("ratelimit_limit", limit, this.ship);
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

  /**
   * Method to handle Mailchimp batch response as a JSON stream
   * @param  {String} { response_body_url }
   * @return {Stream}
   */
  handleResponse({ response_body_url }) {
    const extract = tar.extract();
    const decoder = JSONStream.parse();

    extract.on("entry", (header, stream, callback) => {
      if (header.name.match(/\.json/)) {
        stream.pipe(decoder, { end: false });
      }

      stream.on("end", () => callback()); // ready for next entry
      stream.on("error", () => callback()); // ready for next entry

      stream.resume();
    });

    extract.on("finish", () => decoder.end());
    extract.on("error", () => decoder.end());

    request(response_body_url)
      .pipe(zlib.createGunzip())
      .pipe(extract);

    return decoder
      .pipe(es.map(function write(data, callback) {
        return data.map(r => {
          return callback(null, r);
        });
      }));
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
