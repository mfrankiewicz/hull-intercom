import express from "express";

import KueRouter from "./util/router/kue";

import bootstrap from "./bootstrap";
import AppRouter from "./router/app";
import OAuthRouter from "./router/oauth";
import Worker from "./worker";

const { connector } = bootstrap;

if (process.env.COMBINED) {
  Worker(bootstrap);
}

const app = express();

connector.setupApp(app);

app
  .use("/", AppRouter(bootstrap))
  .use("/auth", OAuthRouter(bootstrap))
  .use("/kue", KueRouter(bootstrap));

connector.startApp(app);
