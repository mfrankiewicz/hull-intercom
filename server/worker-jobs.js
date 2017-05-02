/* @flow */
import { helpersMiddleware } from "hull/lib/utils";

import AppMiddleware from "./lib/middleware/app-middleware";

module.exports = function workerJobs(options: any = {}) {
  const { connector, jobs } = options;

  connector.worker(jobs)
    .use(helpersMiddleware())
    .use(AppMiddleware());

  connector.startWorker();
};
