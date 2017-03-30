import Promise from "bluebird";
import _ from "lodash";

import BatchSyncHandler from "../util/handler/batch-sync";

export default class NotifHandlers {

  static shipUpdateHandler(payload, { req }) {
    const { syncAgent } = req.shipApp;
    if (!syncAgent.isConfigured()) {
      req.hull.client.logger.info("ship is not configured");
      return Promise.resolve();
    }

    return syncAgent.syncShip();
  }

  static segmentUpdateHandler(payload, { req }) {
    const { syncAgent, hullAgent } = req.shipApp;
    if (!syncAgent.isConfigured()) {
      req.hull.client.logger.info("ship is not configured");
      return Promise.resolve();
    }

    const segment = payload.message;
    const fields = syncAgent.userMapping.getHullTraitsKeys();
    return syncAgent.syncShip()
      .then(() => hullAgent.extractAgent.requestExtract({ segment, fields }));
  }

  static segmentDeleteHandler(payload, { req }) {
    const { syncAgent } = req.shipApp;
    if (!syncAgent.isConfigured()) {
      req.hull.client.logger.info("ship is not configured");
      return Promise.resolve();
    }

    return syncAgent.syncShip();
  }

  static userUpdateHandler(payload, { req }) {
    const { syncAgent, queueAgent } = req.shipApp;
    const { logger } = req.hull.client;
    if (!syncAgent.isConfigured()) {
      req.hull.client.logger.info("ship is not configured");
      return Promise.resolve();
    }

    const { user, changes = {}, segments = [], events = [] } = payload.message;
    const { left = [] } = _.get(changes, "segments", {});

    logger.info("outgoing.user.start", _.pick(user, ["email", "id"]));

    if (!_.isEmpty(_.get(changes, "user['traits_intercom/id'][1]"))) {
      logger.info("outgoing.user.skip", _.pick(user, ["email", "id"]));
      return Promise.resolve();
    }
    user.segment_ids = user.segment_ids || segments.map(s => s.id);

    const filteredUser = syncAgent.updateUserSegments(user, {
      add_segment_ids: segments.map(s => s.id),
      remove_segment_ids: left.map(s => s.id)
    });

    if (!filteredUser) {
      logger.info("outgoing.user.skip", _.pick(user, ["email", "id"]));
      return Promise.resolve();
    }

    filteredUser.events = events || [];
    return BatchSyncHandler.getHandler({
      hull: req.hull,
      ship: req.hull.ship,
      ns: "notif",
      options: {
        maxSize: process.env.NOTIFY_BATCH_HANDLER_SIZE || 100,
        throttle: process.env.NOTIFY_BATCH_HANDLER_THROTTLE || 30000
      }
    }).setCallback(users => queueAgent.create("sendUsers", { users }))
    .add(filteredUser);
  }
}
