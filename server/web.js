import Hull from "hull";
import raven from "raven";

import ExitHandler from "./util/exit-handler";
import bootstrap from "./bootstrap";
import BatchSyncHandler from "./util/batch-sync-handler";

import WebApp from "./util/web-app";
import AppRouter from "./router/app";
import StaticRouter from "./util/static-router";
import OAuthRouter from "./router/oauth";
import KueRouter from "./util/kue-router";

const { queueAdapter, instrumentationAgent, shipCache } = bootstrap;

const port = process.env.PORT || 8082;

const app = WebApp();

if (instrumentationAgent.raven) {
  app.use(raven.middleware.express.requestHandler(instrumentationAgent.raven));
}

app
  .use("/app", AppRouter({ Hull, ...bootstrap }))
  .use("/", StaticRouter({ Hull }))
  .use("/auth", OAuthRouter({ Hull, ...bootstrap }))
  .use("/kue", KueRouter({ hostSecret: bootstrap.shipConfig.hostSecret, queueAdapter }));

if (instrumentationAgent.raven) {
  app.use(raven.middleware.express.errorHandler(instrumentationAgent.raven));
}

app.listen(port, () => {
  Hull.logger.info("webApp.listen", port);
});

ExitHandler(BatchSyncHandler.exit);
