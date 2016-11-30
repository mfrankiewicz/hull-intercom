import _ from "lodash";

import BatchSyncHandler from "../util/handler/batch-sync";

export default class Actions {

  static fetchAll(req, res, next) {
    req.shipApp.queueAgent.create("importUsers")
      .then(next, next);
  }

  static batchHandler(req, res, next) {
    const segmentId = req.query.segment_id || null;
    req.shipApp.queueAgent.create("handleBatch", { body: req.body, segmentId })
      .then(next, next);
  }

  static sync(req, res, next) {
    req.shipApp.queueAgent.create("syncUsers")
      .then(next, next);
  }

  static webhook(req, res, next) {
    if (_.get(req, "body.topic") === "user.created") {
      return BatchSyncHandler.getHandler({
        hull: req.hull,
        ship: req.hull.ship,
        ns: "webhook",
        options: {
          maxSize: process.env.NOTIFY_BATCH_HANDLER_SIZE || 100,
          throttle: process.env.NOTIFY_BATCH_HANDLER_THROTTLE || 30000
        }
      })
      .setCallback(users => req.shipApp.queueAgent.create("saveUsers", { users }))
      .add(_.get(req, "body.data.item"))
      .then(next, next);
    }

    return next("ok");
  }

  static fields(req, res) {
    const fieldsMap = _.filter(req.shipApp.syncAgent.userMapping.map, f => !f.read_only)
      .map(f => f.name);
    const customAttributes = req.hull.ship.private_settings.custom_attributes;
    const fields = _.uniq(_.concat(fieldsMap, customAttributes));
    res.json({
      options: fields.map(f => {
        return { label: f, value: f };
      })
    });
  }
}
