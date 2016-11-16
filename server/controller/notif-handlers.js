import Promise from "bluebird";
import _ from "lodash";
import BatchSyncHandler from "../util/batch-sync-handler";

export default class NotifHandlers {

  static shipUpdateHandler(payload, { req }) {
    console.log("SHIP, UPDATE");
    const { syncAgent, hullAgent } = req.shipApp;
    return syncAgent.syncShip();
  }

  static userUpdateHandler(payload, { req }) {
    const { syncAgent, queueAgent, hullAgent } = req.shipApp;
    let { user, changes = {}, segments = [] } = payload.message;
    const { left = [] } = changes.segments || {};

    if (!_.isEmpty(_.get(changes, "user['traits_intercom/id'][1]"))) {
      req.hull.client.logger.info("user skipped");
      return Promise.resolve();
    }

    user = syncAgent.updateUserSegments(user, {
      add_segment_ids: segments.map(s => s.id),
      remove_segment_ids: left.map(s => s.id)
    });

    if (!user) {
      return Promise.resolve();
    }

    return BatchSyncHandler.getHandler({
      hull: req.hull,
      ship: req.hull.ship,
      options: {
        maxSize: process.env.NOTIFY_BATCH_HANDLER_SIZE || 100,
        throttle: process.env.NOTIFY_BATCH_HANDLER_THROTTLE || 30000
      }
    }).setCallback(users => queueAgent.create("sendUsers", { users }))
    .add(user);
  }
}
