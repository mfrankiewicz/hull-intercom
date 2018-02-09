import Promise from "bluebird";

export default function segmentUpdate(ctx) {
  const { syncAgent } = ctx.service;
  if (!syncAgent.isConfigured()) {
    ctx.client.logger.error("connector.configuration.error", { errors: "connector is not configured" });
    return Promise.resolve();
  }

  return syncAgent.syncShip();
}
