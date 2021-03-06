/* @flow */
import { Router } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { notifHandler, responseMiddleware } from "hull/lib/utils";

import appMiddleware from "../lib/middleware/app-middleware";
import requireConfiguration from "../lib/middleware/require-configuration";
import * as notifHandlers from "./../notif-handlers";
import * as actions from "./../actions";

export default function AppRouter(): Router {
  const router = new Router();

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  // const middlewareSet = [requireConfiguration];

  router.use(appMiddleware());
  // router.use("/batch", requireConfiguration, actions.batchHandler, responseMiddleware());
  router.use("/batch", notifHandler({
    handlers: {
      "user:update": notifHandlers.batch
    }
  }));

  router.use("/notify", notifHandler({
    userHandlerOptions: {
      maxSize: parseInt(process.env.SNS_SIZE, 10) || 50,
      groupTraits: false
    },
    handlers: {
      "segment:update": notifHandlers.segmentUpdate,
      "segment:delete": notifHandlers.segmentDelete,
      "user:update": notifHandlers.userUpdate,
      "ship:update": notifHandlers.shipUpdate
    }
  }));

  router.post("/fetch-all", requireConfiguration, actions.fetchAll, responseMiddleware());
  // FIXME: 404 for that endpoint?
  router.use("/intercom", bodyParser.json(), requireConfiguration, actions.webhook, responseMiddleware());

  router.post("/sync", requireConfiguration, actions.sync, responseMiddleware());

  router.post("/fetch-leads", requireConfiguration, actions.fetchLeads, responseMiddleware());

  router.get("/schema/user_fields", cors(), requireConfiguration, actions.fields);

  router.all("/status", actions.statusCheck);

  return router;
}
