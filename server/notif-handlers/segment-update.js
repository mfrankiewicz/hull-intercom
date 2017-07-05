import Promise from "bluebird";

export default function segmentUpdate(ctx, segment) {
  const { syncAgent } = ctx.service;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.error("connector.configuration.error", { errors: "ship is not configured" });
    return Promise.resolve();
  }
  const fields = syncAgent.userMapping.getHullTraitsKeys();
  return syncAgent.syncShip()
    .then(() => ctx.helpers.requestExtract({ segment, fields, description: "sync after segment update" }));
}
