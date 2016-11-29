import { Router } from "express";
import bodyParser from "body-parser";
import cors from "cors";

import ParseMessageMiddleware from "../util/middleware/parse-message";
import NotifHandler from "../util/notif-handler";
import ResponseMiddleware from "../util/middleware/response";
import RequireConfiguration from "../util/middleware/require-configuration";

export default function AppRouter(deps) {
  const router = new Router();
  const { hullMiddleware, appMiddleware } = deps;
  const { Actions, NotifHandlers } = deps.controllers;

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  router.post("/fetch-all", hullMiddleware, appMiddleware, RequireConfiguration, Actions.fetchAll, ResponseMiddleware);
  router.post("/batch", hullMiddleware, appMiddleware, RequireConfiguration, bodyParser.json(), Actions.batchHandler, ResponseMiddleware);
  router.post("/notify", ParseMessageMiddleware, hullMiddleware, appMiddleware, NotifHandler(deps.Hull, {
    hostSecret: deps.shipConfig.hostSecret,
    groupTraits: false,
    handlers: {
      "segment:update": NotifHandlers.segmentUpdateHandler,
      "segment:delete": NotifHandlers.segmentDeleteHandler,
      "user:update": NotifHandlers.userUpdateHandler,
      "ship:update": NotifHandlers.shipUpdateHandler,
    },
    shipCache: deps.shipCache
  }));

  // FIXME: 404 for that endpoint?
  router.post("/intercom", hullMiddleware, appMiddleware, RequireConfiguration, bodyParser.json(), Actions.webhook, ResponseMiddleware);

  router.post("/sync", hullMiddleware, appMiddleware, RequireConfiguration, bodyParser.json(), Actions.sync, ResponseMiddleware);

  router.get("/schema/user_fields", cors(), hullMiddleware, appMiddleware, RequireConfiguration, bodyParser.json(), Actions.fields);

  return router;
}
