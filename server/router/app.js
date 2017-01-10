import { Router } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { NotifHandler } from "hull";

import responseMiddleware from "../util/middleware/response";
import requireConfiguration from "../util/middleware/require-configuration";
import tokenMiddleware from "../util/middleware/token";

export default function AppRouter(deps) {
  const router = new Router();
  const { hullMiddleware, appMiddleware } = deps;
  const { Actions, NotifHandlers } = deps.controllers;

  const wrapWithMiddleware = (fn) => {
    return (payload, context) => {
      appMiddleware(context.req, {}, () => {});
      return fn(payload, context);
    };
  };

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  const middlewareSet = [tokenMiddleware, hullMiddleware, appMiddleware, requireConfiguration, bodyParser.json()];

  router.post("/fetch-all", ...middlewareSet, Actions.fetchAll, responseMiddleware);
  router.post("/batch", ...middlewareSet, Actions.batchHandler, responseMiddleware);
  router.post("/notify", NotifHandler({
    hostSecret: deps.shipConfig.hostSecret,
    groupTraits: false,
    handlers: {
      "segment:update": wrapWithMiddleware(NotifHandlers.segmentUpdateHandler),
      "segment:delete": wrapWithMiddleware(NotifHandlers.segmentDeleteHandler),
      "user:update": wrapWithMiddleware(NotifHandlers.userUpdateHandler),
      "ship:update": wrapWithMiddleware(NotifHandlers.shipUpdateHandler)
    },
    shipCache: deps.shipCache
  }));

  // FIXME: 404 for that endpoint?
  router.post("/intercom", ...middlewareSet, Actions.webhook, responseMiddleware);

  router.post("/sync", ...middlewareSet, Actions.sync, responseMiddleware);

  router.get("/schema/user_fields", cors(), ...middlewareSet, Actions.fields);

  return router;
}
