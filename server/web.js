/* @flow */
import express from "express";

import KueRouter from "./router/kue";

import bootstrap from "./bootstrap";
import AppRouter from "./router/app";
import OAuthRouter from "./router/oauth";
import WorkerJobs from "./worker-jobs";

const { connector } = bootstrap;

const app = express();

connector.setupApp(app);

app
  .use("/", AppRouter(bootstrap))
  .use("/auth", OAuthRouter(bootstrap))
  .use("/kue", KueRouter(bootstrap.connector));

if (process.env.COMBINED) {
  WorkerJobs(bootstrap);
}

connector.startApp(app);
