import Promise from "bluebird";

export default function segmentUpdate(ctx, segment) {
  const { syncAgent } = ctx.service;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.info("ship is not configured");
    return Promise.resolve();
  }
  const fields = syncAgent.userMapping.getHullTraitsKeys();
  return syncAgent.syncShip()
    .then(() => ctx.helpers.requestExtract({ segment, fields, description: "sync after segment update" }));
}
