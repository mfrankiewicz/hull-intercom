import IntercomClient from "./intercom-client";
import SyncAgent from "./sync-agent";
import IntercomAgent from "./intercom-agent";

export default function AppMiddleware() {
  return function middleware(req, res, next) {
    req.hull.shipApp = req.hull.shipApp || {};
    const ctx = req.hull;

    if (!req.hull.ship) {
      return next();
    }

    const intercomClient = new IntercomClient(ctx);
    const intercomAgent = new IntercomAgent(intercomClient, ctx);
    const syncAgent = new SyncAgent(intercomAgent, ctx.client, ctx.segments, ctx.metric, ctx.ship, ctx.helpers, ctx.hostname);

    req.hull.shipApp = {
      intercomClient,
      intercomAgent,
      syncAgent
    };

    return next();
  };
}
