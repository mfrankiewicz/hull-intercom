import util from "util";
import raven from "raven";

export default class InstrumentationAgent {

  constructor() {
    this.nr = null;
    this.raven = null;

    if (process.env.NEW_RELIC_LICENSE_KEY) {
      this.nr = require("newrelic"); // eslint-disable-line global-require
    }

    if (process.env.SENTRY_URL) {
      console.log("starting raven");
      this.raven = new raven.Client(process.env.SENTRY_URL);
      this.raven.patchGlobal();
    }
  }

  startTransaction(jobName, callback) {
    if (this.nr) {
      return this.nr.createBackgroundTransaction(jobName, callback)();
    }
    return callback();
  }

  endTransaction() {
    if (this.nr) {
      this.nr.endTransaction();
    }
  }

  catchError(err, extra = {}, tags = {}) {
    if (this.raven && err) {
      return this.raven.captureException(err, {
        extra,
        tags,
        fingerprint: [
          "{{ default }}",
          err.message
        ]
      });
    }
    return console.error(util.inspect(err, { depth: 10 }));
  }

  metricVal(metric = "", value = 1, ship = {}) {
    try {
      if (this.librato) {
        this.librato.measure(`hubspot.${metric}`, value, Object.assign({}, { source: ship.id }));
      }
    } catch (err) {
      console.warn("error in librato.measure", err);
    }
  }

  metricInc(metric = "", value = 1, ship = {}) {
    try {
      if (this.librato) {
        this.librato.increment(`hubspot.${metric}`, value, Object.assign({}, { source: ship.id }));
      }
    } catch (err) {
      console.warn("error in librato.measure", err);
    }
  }
}
