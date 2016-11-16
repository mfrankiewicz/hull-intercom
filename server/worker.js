import Hull from "hull";

import WorkerApp from "./util/worker-app";
import ExitHandler from "./util/exit-handler";

import bootstrap from "./bootstrap";
import AppMiddleware from "./lib/app-middleware";

const workerApp = new WorkerApp(bootstrap);

const { hullMiddleware, shipCache, instrumentationAgent, queueAdapter, appMiddleware } = bootstrap;

workerApp
  .use(hullMiddleware)
  .use(appMiddleware);

workerApp.process();

Hull.logger.info("workerApp.process");

ExitHandler(queueAdapter.exit.bind(queueAdapter));
