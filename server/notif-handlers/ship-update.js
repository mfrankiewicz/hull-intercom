import Promise from "bluebird";

export default function shipUpdate(ctx) {
  const { syncAgent } = ctx.service;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.info("ship is not configured");
    return Promise.resolve();
  }

  return syncAgent.syncShip();
}
