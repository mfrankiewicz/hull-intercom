import Hull from "hull";

import ExitHandler from "./util/exit-handler";
import bootstrap from "./bootstrap";
import AppMiddleware from "./lib/app-middleware";
import WorkerApp from "./util/worker-app";
import WorkerRouter from "./router/worker";

const workerApp = new WorkerApp(bootstrap);

const { hullMiddleware, shipCache, instrumentationAgent, queueAdapter } = bootstrap;

workerApp
  .use(hullMiddleware)
  .use(AppMiddleware(bootstrap))
  .use(WorkerRouter());

workerApp.process();

Hull.logger.info("workerApp.process");

ExitHandler(queueAdapter.exit);
