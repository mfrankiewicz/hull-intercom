/* @flow */
import { Router } from "express";
import cors from "cors";
import { notifHandler, responseMiddleware } from "hull/lib/utils";

import appMiddleware from "../lib/middleware/app-middleware";
import requireConfiguration from "../lib/middleware/require-configuration";
import * as notifHandlers from "./../notif-handlers";
import * as actions from "./../actions";

export default function AppRouter(): Router {
  const router = new Router();
  router.use(appMiddleware());
  router.use("/batch", requireConfiguration, actions.batchHandler, responseMiddleware());

  router.use("/notify", notifHandler({
    userHandlerOptions: {
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
  router.use("/intercom", requireConfiguration, actions.webhook, responseMiddleware());

  router.post("/sync", requireConfiguration, actions.sync, responseMiddleware());

  router.post("/fetch-leads", requireConfiguration, actions.fetchLeads, responseMiddleware());

  router.get("/schema/user_fields", cors(), requireConfiguration, actions.fields);

  router.all("/status", actions.statusCheck);

  return router;
}
