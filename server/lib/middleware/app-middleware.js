/* @flow */
import { Request, Response, Next } from "express";
import Redlock from "redlock";
import redis from "redis";
import Promise from "bluebird";

import IntercomClient from "../intercom-client";
import SyncAgent from "../sync-agent";
import IntercomAgent from "../intercom-agent";

let redlock;
if (false && process.env.REDIS_URL) {
  const client = redis.createClient(process.env.REDIS_URL);
  redlock = new Redlock([client]);
}

export default function AppMiddleware() {
  return function middleware(req: Request, res: Response, next: Next) {
    req.hull.service = req.hull.service || {};
    const ctx = req.hull;

    if (!req.hull.ship) {
      return next();
    }

    const intercomClient = new IntercomClient(ctx);
    const intercomAgent = new IntercomAgent(intercomClient, ctx);
    const syncAgent = new SyncAgent(intercomAgent, ctx.client, ctx.segments, ctx.metric, ctx.ship, ctx.helpers, ctx.hostname, ctx.cache);

    req.hull.service = {
      intercomClient,
      intercomAgent,
      syncAgent
    };

    req.hull.lock = {
      get: function getLock(resource, ttl) {
        resource = [req.hull.ship.id, resource].join("-");
        if (redlock) {
          return redlock.lock(resource, ttl);
        }
        return Promise.resolve();
      },
      extend: function extendLock(resource, ttl) {
        resource = [req.hull.ship.id, resource].join("-");
        if (redlock) {
          return redlock.extend(resource, ttl);
        }
        return Promise.resolve();
      }
    };

    return next();
  };
}
