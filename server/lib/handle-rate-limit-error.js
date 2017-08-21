// @flow
import Promise from "bluebird";
import _ from "lodash";
import moment from "moment";

export default function handleRateLimitError(ctx: Object, jobName: String, payload: Object, err: Error): Promise {
  if (_.get(err, "statusCode") === 429 || _.get(err, "response.statusCode") === 429) {
    const resetIn = _.get(err, "response.header.x-ratelimit-reset")
      ? moment(_.get(err, "response.header.x-ratelimit-reset"), "X").diff()
      : 0;
    // between 10 seconds and 10 minutes
    const seconds = _.random(10, 600);
    const url = _.get(err, "req.url") || _.get(err, "response.request.url");
    const method = _.get(err, "req.method") || _.get(err, "response.request.method");
    const miliseconds = parseInt(process.env.OVERRIDE_RATE_LIMIT_DELAY, 10) || seconds * 1000;
    const delay = resetIn + miliseconds;
    ctx.client.logger.warn("service.api.ratelimit", { message: "wait 10 seconds to retry", jobName, url, method, delay });
    return ctx.enqueue(jobName, payload, { delay });
  }
  return Promise.reject(err);
}
