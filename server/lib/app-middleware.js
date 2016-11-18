import _ from "lodash";

import IntercomClient from "./intercom-client";
import SyncAgent from "./sync-agent";
import HullAgent from "../util/hull-agent";
import IntercomAgent from "./intercom-agent";
import QueueAgent from "../util/queue/queue-agent";

export default function AppMiddleware({ queueAdapter, shipCache }) {
  return function middleware(req, res, next) {
    req.shipApp = req.shipApp || {};

    if (!req.hull.ship) {
      return next();
    }

    const intercomClient = new IntercomClient(req.hull.ship);
    const queueAgent = new QueueAgent(queueAdapter, req);
    const intercomAgent = new IntercomAgent(intercomClient, queueAgent, req.hull.ship, req.hull.client);
    const hullAgent = new HullAgent(req.hull.ship, req.hull.client, shipCache, _.pick(req, ["hostname", "query"]));
    const syncAgent = new SyncAgent(intercomAgent, hullAgent, req.hull.ship, req.hostname);

    req.shipApp = {
      intercomClient,
      queueAgent,
      intercomAgent,
      hullAgent,
      syncAgent
    };

    return next();
  };
}
