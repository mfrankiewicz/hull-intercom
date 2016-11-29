import WorkerApp from "./util/worker-app";
import ExitHandler from "./util/exit-handler";

import bootstrap from "./bootstrap";

const workerApp = new WorkerApp(bootstrap);

const { hullMiddleware, queueAdapter, appMiddleware } = bootstrap;

workerApp
  .use(hullMiddleware)
  .use(appMiddleware);

workerApp.process();

bootstrap.Hull.logger.info("workerApp.process");

ExitHandler(queueAdapter.exit.bind(queueAdapter));
