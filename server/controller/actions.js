import _ from "lodash";

import BatchSyncHandler from "../lib/batch-sync";

export default class Actions {

  static fetchAll(req, res, next) {
    req.hull.enqueue("fetchAllUsers")
      .then(next, next);
  }

  static handleBatchAction(req, res, next) {
    req.hull.query.segmentId = req.query.segment_id || null;
    next();
  }

  static sync(req, res, next) {
    req.hull.enqueue("fetchUsers")
      .then(next, next);
  }

  static webhook(req, res, next) {
    req.hull.client.logger.debug("intercom message", req.body);
    if (_.get(req, "body.topic") === "user.created") {
      // map the users to get only mapped fields
      return BatchSyncHandler.getHandler({
        client: req.hull.client,
        ship: req.hull.ship,
        ns: "webhook",
        options: {
          maxSize: process.env.NOTIFY_BATCH_HANDLER_SIZE || 100,
          throttle: process.env.NOTIFY_BATCH_HANDLER_THROTTLE || 30000
        }
      })
      .setCallback(users => req.hull.enqueue("saveUsers", { users }))
      .add(_.get(req, "body.data.item"))
      .then(next, next);
    }

    return BatchSyncHandler.getHandler({
      client: req.hull.client,
      ship: req.hull.ship,
      ns: "webhook_events",
      options: {
        maxSize: process.env.NOTIFY_BATCH_HANDLER_SIZE || 100,
        throttle: process.env.NOTIFY_BATCH_HANDLER_THROTTLE || 30000
      }
    })
    .setCallback(events => req.hull.enqueue("saveEvents", { events }))
    .add(_.get(req, "body"))
    .then(next, next);
  }

  static fields(req, res) {
    const fieldsMap = _.filter(req.hull.shipApp.syncAgent.userMapping.map, f => !f.read_only)
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
