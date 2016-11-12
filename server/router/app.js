import { Router } from "express";
import bodyParser from "body-parser";
import moment from "moment";

import AppMiddleware from "../lib/app-middleware";
import Actions from "../controller/actions"

export default function AppRouter(deps) {
  const router = new Router();
  const actions = new Actions();

  // FIXME: since we have two routers on the same mountpoint: "/"
  // all middleware applied here also is applied to the static router,
  // which is a bad things, that's why we add the middleware on per route basis
  // router.use(deps.hullMiddleware);
  // router.use(AppMiddleware(deps));

  router.post("/fetch-all", deps.hullMiddleware, AppMiddleware(deps), actions.fetchAll);
  router.post("/batch", deps.hullMiddleware, AppMiddleware(deps), bodyParser.json(), actions.batchHandler);

  return router;
}
