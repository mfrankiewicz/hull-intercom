/* @flow */
import express from "express";
import queueUiRouter from "hull/lib/infra/queue/ui-router";

import appRouter from "./router/app";
import oAuthRouter from "./router/oauth";

export default function server(app: express, dependencies: Object = {}): express {
  const { hostSecret, queue } = dependencies;

  app.use("/", appRouter(dependencies));

  app.use("/auth", oAuthRouter(dependencies));

  if (queue.adapter.app) {
    app.use("/kue", queueUiRouter({ hostSecret, queueAgent: queue }));
  }
  return app;
}
