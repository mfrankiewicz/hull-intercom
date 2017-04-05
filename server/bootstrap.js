import CacheManager from "cache-manager";
import Hull from "hull";

import AppMiddleware from "./lib/app-middleware";
import InstrumentationAgent from "./util/instrumentation-agent";
import KueAdapter from "./util/queue/adapter/kue";
import * as controllers from "./controller";

if (process.env.LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

Hull.logger.transports.console.json = true;

const shipConfig = {
  hostSecret: process.env.SECRET || "1234",
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
};

const instrumentationAgent = new InstrumentationAgent("intercom");

const queueAdapter = new KueAdapter(({
  prefix: process.env.KUE_PREFIX || "hull-intercom",
  redis: process.env.REDIS_URL
}));

const cacheManager = CacheManager.caching({
  store: "memory",
  max: process.env.SHIP_CACHE_MAX || 100,
  ttl: process.env.SHIP_CACHE_TTL || 60
});

const shipCache = new Hull.ShipCache(cacheManager, process.env.SHIP_CACHE_PREFIX || "hull-intercom");
const hullMiddleware = new Hull.Middleware({ hostSecret: shipConfig.hostSecret, shipCache, clientConfig: { flushAt: 100, flushAfter: 500 } });
const appMiddleware = new AppMiddleware({ queueAdapter, shipCache, instrumentationAgent });

export default {
  queueAdapter,
  instrumentationAgent,
  shipCache,
  hullMiddleware,
  shipConfig,
  appMiddleware,
  controllers,
  jobs: controllers.Jobs,
  Hull
};
