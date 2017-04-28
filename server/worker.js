import { helpersMiddleware } from "hull/lib/utils";

import AppMiddleware from "./lib/middleware/app-middleware";

module.exports = function worker(options = {}) {
  const { connector, jobs } = options;

  connector.worker(jobs)
    .use(helpersMiddleware())
    .use(AppMiddleware());

  connector.startWorker();
};
