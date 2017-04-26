import _ from "lodash";
import Promise from "bluebird";

const HANDLERS = {};

export default class BatchSyncHandler {

  static exit() {
    console.log("BatchSyncHandler.exit");
    if (!BatchSyncHandler.exiting) {
      const exiting = Promise.all(_.map(HANDLERS, (h) => h.flush()));
      BatchSyncHandler.exiting = exiting;
      return exiting;
    }
    return Promise.resolve([]);
  }

  static getHandler(args) {
    const name = args.ns + args.ship.id;
    return HANDLERS[name] = HANDLERS[name] || new BatchSyncHandler(args); // eslint-disable-line no-return-assign
  }

  constructor({ ns = "", client, options = {} }) {
    this.ns = ns;
    this.client = client;
    this.messages = [];
    this.options = options;

    this.flushLater = _.throttle(this.flush.bind(this), this.options.throttle);
    return this;
  }

  setCallback(callback) {
    this.callback = callback;
    return this;
  }

  add(message) {
    this.messages.push(message);
    this.client.logger.debug("batchSyncHandler.added", this.messages.length);
    const { maxSize } = this.options;
    if (this.messages.length >= maxSize) {
      this.flush();
    } else {
      this.flushLater();
    }
    return Promise.resolve("ok");
  }

  flush() {
    const messages = this.messages;
    this.client.logger.debug("batchSyncHandler.flush", messages.length);
    this.messages = [];
    return this.callback(messages)
      .then(() => {
        this.client.logger.debug("batchSyncHandler.flush.sucess");
      }, (err) => {
        console.error(err);
        this.client.logger.error("batchSyncHandler.flush.error", err);
      });
  }
}
