import Promise from "bluebird";
import _ from "lodash";

export default class NotifHandlers {

  shipUpdateHandler(payload, { req }) {
    console.log("SHIP, UPDATE");
    const { syncAgent, hullAgent } = req.shipApp;
    return syncAgent.webhookAgent.ensureWebhook()
      .then(() => hullAgent.getSegments())
      .then((segments) => {
        return syncAgent.tagMapping.sync(segments)
      });
  }
}
