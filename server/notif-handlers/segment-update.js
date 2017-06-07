import Promise from "bluebird";

export default function segmentUpdate(ctx, payload) {
  const { syncAgent } = ctx.service;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.info("ship is not configured");
    return Promise.resolve();
  }

  const segment = payload.message;
  const fields = syncAgent.userMapping.getHullTraitsKeys();
  return syncAgent.syncShip()
    .then(() => ctx.helpers.requestExtract({ segment, fields }));
}
