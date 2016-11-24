import Hull from "hull";
import raven from "raven";

import WebApp from "./util/web-app";
import ExitHandler from "./util/exit-handler";
import BatchSyncHandler from "./util/batch-sync-handler";
import StaticRouter from "./util/static-router";
import KueRouter from "./util/kue-router";

import bootstrap from "./bootstrap";
import AppRouter from "./router/app";
import OAuthRouter from "./router/oauth";

const { queueAdapter, instrumentationAgent } = bootstrap;

const port = process.env.PORT || 8082;

const app = WebApp();

if (instrumentationAgent.raven) {
  app.use(raven.middleware.express.requestHandler(instrumentationAgent.raven));
}

app
  .use("/", AppRouter({ Hull, ...bootstrap }))
  .use("/", StaticRouter({ Hull }))
  .use("/auth", OAuthRouter({ Hull, ...bootstrap }))
  .use("/kue", KueRouter({ hostSecret: bootstrap.shipConfig.hostSecret, queueAdapter }));

if (instrumentationAgent.raven) {
  app.use(raven.middleware.express.errorHandler(instrumentationAgent.raven));
}

app.listen(port, () => {
  Hull.logger.info("webApp.listen", port);
});

ExitHandler(BatchSyncHandler.exit.bind(BatchSyncHandler));
