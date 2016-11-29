import { Router } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { NotifHandler } from "hull";

import ResponseMiddleware from "../util/middleware/response";
import RequireConfiguration from "../util/middleware/require-configuration";

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

  const middlewareSet = [hullMiddleware, appMiddleware, RequireConfiguration, bodyParser.json()];

  router.post("/fetch-all", ...middlewareSet, Actions.fetchAll, ResponseMiddleware);
  router.post("/batch", ...middlewareSet, Actions.batchHandler, ResponseMiddleware);
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
  router.post("/intercom", ...middlewareSet, Actions.webhook, ResponseMiddleware);

  router.post("/sync", ...middlewareSet, Actions.sync, ResponseMiddleware);

  router.get("/schema/user_fields", cors(), ...middlewareSet, Actions.fields);

  return router;
}
