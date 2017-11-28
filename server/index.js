/* @flow */
import Hull from "hull";
import { Queue, Cache } from "hull/lib/infra";
import express from "express";

import server from "./server";
import worker from "./worker";

const {
  PORT = 8082,
  LOG_LEVEL,
  SECRET = "1234",
  CLIENT_ID,
  CLIENT_SECRET,
  KUE_PREFIX = "hull-intercom",
  REDIS_URL,
  SHIP_CACHE_MAX = 100,
  SHIP_CACHE_TTL = 60,
  OVERRIDE_FIREHOSE_URL
} = process.env;

if (LOG_LEVEL) {
  Hull.logger.transports.console.level = LOG_LEVEL;
}

const cache = new Cache({
  store: "memory",
  max: SHIP_CACHE_MAX,
  ttl: SHIP_CACHE_TTL
});

const queue = new Queue("kue", {
  prefix: KUE_PREFIX,
  redis: REDIS_URL
});

const connector = new Hull.Connector({
  queue, cache, hostSecret: SECRET, port: PORT
});
const app = express();

connector.setupApp(app);

if (process.env.WORKER || process.env.COMBINED) {
  worker(connector);
  connector.startWorker();
}

if (process.env.WEB || process.env.COMBINED) {
  server(app, {
    hostSecret: SECRET,
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    queue,
    cache,
    clientConfig: {
      firehoseUrl: OVERRIDE_FIREHOSE_URL
    }
  });
  connector.startApp(app);
}
