import { Router } from "express";
import bodyParser from "body-parser";
import moment from "moment";

import ParseMessageMiddleware from "../util/parse-message-middleware";
import NotifHandler from "../util/notif-handler";
import ResponseMiddleware from "../util/middleware/response";

export default function AppRouter(deps) {
  const router = new Router();
  const { hullMiddleware, appMiddleware } = deps;
  const { Actions, NotifHandlers } = deps.controllers;

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  router.post("/fetch-all", hullMiddleware, appMiddleware, Actions.fetchAll, ResponseMiddleware);
  router.post("/batch", hullMiddleware, appMiddleware, bodyParser.json(), Actions.batchHandler, ResponseMiddleware);
  router.post("/notify", ParseMessageMiddleware, hullMiddleware, appMiddleware, NotifHandler(deps.Hull, {
    hostSecret: deps.shipConfig.hostSecret,
    groupTraits: false,
    handlers: {
      // "segment:update": notifyController.segmentUpdateHandler,
      // "segment:delete": notifyController.segmentDeleteHandler,
      "user:update": NotifHandlers.userUpdateHandler,
      "ship:update": NotifHandlers.shipUpdateHandler,
    },
    shipCache: deps.shipCache
  }));

  // FIXME: 404 for that endpoint?
  router.post("/intercom", hullMiddleware, appMiddleware, bodyParser.json(), Actions.webhook, ResponseMiddleware);

  router.post("/sync", hullMiddleware, appMiddleware, bodyParser.json(), Actions.sync, ResponseMiddleware);

  return router;
}
