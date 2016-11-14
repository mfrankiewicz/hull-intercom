import Hull from "hull";

import ExitHandler from "./util/exit-handler";
import bootstrap from "./bootstrap";
import AppMiddleware from "./lib/app-middleware";
import WorkerApp from "./util/worker-app";
import WorkerRouter from "./router/worker";

const workerApp = new WorkerApp(bootstrap);

const { hullMiddleware, shipCache, instrumentationAgent, queueAdapter, appMiddleware } = bootstrap;

workerApp
  .use(hullMiddleware)
  .use(appMiddleware)
  .use(WorkerRouter());

workerApp.process();

Hull.logger.info("workerApp.process");

ExitHandler(queueAdapter.exit);
