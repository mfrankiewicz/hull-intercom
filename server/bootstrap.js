import Hull from "hull";
import { Queue, Cache } from "hull/lib/infra";

import * as controllers from "./controller";


const {
  PORT = 8082,
  LOG_LEVEL,
  SECRET = "1234",
  CLIENT_ID,
  CLIENT_SECRET,
  KUE_PREFIX = "hull-intercom",
  REDIS_URL,
  SHIP_CACHE_MAX = 100,
  SHIP_CACHE_TTL = 60
} = process.env;

if (LOG_LEVEL) {
  Hull.logger.transports.console.level = LOG_LEVEL;
}

Hull.logger.transports.console.stringify = true;

const shipConfig = {
  hostSecret: SECRET,
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET
};

const cache = new Cache({
  store: "memory",
  max: SHIP_CACHE_MAX,
  ttl: SHIP_CACHE_TTL
});

const queue = new Queue("kue", {
  prefix: KUE_PREFIX,
  redis: REDIS_URL
});

const connector = new Hull.Connector({ queue, cache, hostSecret: SECRET, port: PORT });

export default {
  connector,
  shipConfig,
  controllers,
  jobs: controllers.Jobs,
  cache
};
