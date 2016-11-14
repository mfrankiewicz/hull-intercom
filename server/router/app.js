import { Router } from "express";
import bodyParser from "body-parser";
import moment from "moment";
import cors from 'cors';

import ParseMessageMiddleware from "../util/parse-message-middleware";
import NotifHandler from "../util/notif-handler";

import Actions from "../controller/actions"
import NotifHandlers from "../controller/notif-handlers"

export default function AppRouter(deps) {
  const router = new Router();
  const actions = new Actions();
  const notifHandlers = new NotifHandlers();

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  router.use("/notify", ParseMessageMiddleware)

  router.post("/fetch-all", deps.hullMiddleware, deps.appMiddleware, actions.fetchAll);
  router.post("/batch", deps.hullMiddleware, deps.appMiddleware, bodyParser.json(), actions.batchHandler);
  router.post("/notify", deps.hullMiddleware, deps.appMiddleware, NotifHandler(deps.Hull, {
    hostSecret: deps.shipConfig.hostSecret,
    groupTraits: false,
    handlers: {
      // "segment:update": notifyController.segmentUpdateHandler,
      // "segment:delete": notifyController.segmentDeleteHandler,
      // "user:update": notifyController.userUpdateHandler,
      "ship:update": notifHandlers.shipUpdateHandler,
    },
    shipCache: deps.shipCache
  }));

  router.get("/schema/user", cors(), actions.userSchema);

  router.post("/intercom", bodyParser.json(), actions.webhook);

  return router;
}
