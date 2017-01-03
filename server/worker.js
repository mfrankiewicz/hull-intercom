import WorkerApp from "./util/app/worker";
import ExitHandler from "./util/handler/exit";

import bootstrap from "./bootstrap";

const workerApp = new WorkerApp(bootstrap);

const { hullMiddleware, queueAdapter, appMiddleware } = bootstrap;

workerApp
  .use(hullMiddleware)
  .use(appMiddleware);

workerApp.process();

bootstrap.Hull.logger.info("workerApp.process");

ExitHandler(queueAdapter.exit.bind(queueAdapter));
