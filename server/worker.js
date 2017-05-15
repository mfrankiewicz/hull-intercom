/* @flow */
import { Connector } from "hull";

import appMiddleware from "./lib/middleware/app-middleware";
import * as jobs from "./jobs";

export default function worker(connector: Connector) {
  return connector.worker(jobs)
    .use(appMiddleware());
}
