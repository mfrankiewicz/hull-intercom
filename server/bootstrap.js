import CacheManager from "cache-manager";
import Hull from "hull";

import AppMiddleware from "./lib/app-middleware";
import InstrumentationAgent from "./util/instrumentation-agent";
import KueAdapter from "./util/queue/adapter/kue";

const shipConfig = {
  hostSecret: process.env.SECRET || "1234",
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
};

const instrumentationAgent = new InstrumentationAgent();

const queueAdapter = new KueAdapter(({
  prefix: process.env.KUE_PREFIX || "hull-hubspot",
  redis: process.env.REDIS_URL
}));

const cacheManager = CacheManager.caching({
  store: "memory",
  max: process.env.SHIP_CACHE_MAX || 100,
  ttl: process.env.SHIP_CACHE_TTL || 60
});

const shipCache = new Hull.ShipCache(cacheManager, process.env.SHIP_CACHE_PREFIX || "hull-hubspot");
const hullMiddleware = new Hull.Middleware({ hostSecret: shipConfig.hostSecret, shipCache });
const appMiddleware = new AppMiddleware({ queueAdapter, shipCache });

export default { queueAdapter, instrumentationAgent, shipCache, hullMiddleware, shipConfig, appMiddleware };
