import WebApp from "./util/web-app";
import ExitHandler from "./util/exit-handler";
import BatchSyncHandler from "./util/batch-sync-handler";
import StaticRouter from "./util/static-router";
import KueRouter from "./util/kue-router";

import bootstrap from "./bootstrap";
import AppRouter from "./router/app";
import OAuthRouter from "./router/oauth";

const { instrumentationAgent } = bootstrap;

const port = process.env.PORT || 8082;

const app = WebApp();

app
  .use(instrumentationAgent.startMiddleware())
  .use("/", AppRouter(bootstrap))
  .use("/", StaticRouter(bootstrap))
  .use("/auth", OAuthRouter(bootstrap))
  .use("/kue", KueRouter(bootstrap))
  .use(instrumentationAgent.stopMiddleware());

app.listen(port, () => {
  bootstrap.Hull.logger.info("webApp.listen", port);
});

ExitHandler(BatchSyncHandler.exit.bind(BatchSyncHandler));
