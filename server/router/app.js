import { Router } from "express";
import { Strategy as IntercomStrategy } from "passport-intercom";
import moment from "moment";

import AppMiddleware from "../lib/app-middleware";

export default function AppRouter(deps) {
  const router = new Router();

  router.use(deps.hullMiddleware);
  router.use(AppMiddleware(deps));

  router.post("/fetch-all", (req, res) => {
    req.shipApp.queueAgent.create("importUsers")
      .then(res => console.log(res), err => console.log(err));
    res.end("ok");
  });

  return router;
}
