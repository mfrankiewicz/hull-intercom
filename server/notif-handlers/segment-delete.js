import Promise from "bluebird";

export default function segmentDelete(ctx) {
  const { syncAgent } = ctx.shipApp;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.info("ship is not configured");
    return Promise.resolve();
  }

  return syncAgent.syncShip();
}
