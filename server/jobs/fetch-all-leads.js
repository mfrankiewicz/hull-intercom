import Promise from "bluebird";
import _ from "lodash";

import saveLeads from "./save-leads";
import getLeadsScroll from "../lib/lead/get-leads-scroll";

export default function fetchAllLeads(ctx, payload = {}) {
  const { scroll_param, updated_after, updated_before } = payload;
  if (_.isEmpty(scroll_param)) {
    ctx.metric.event({
      title: "fetchAllLeads"
    });
  }
  return getLeadsScroll(ctx, scroll_param, updated_after, updated_before)
    .then(({ leads, scroll_param: next_scroll_param }) => {
      ctx.client.logger.info("incoming.job.progress", { jobName: "fetchAllLeads", next_scroll_param, progress: (leads || []).length });
      if (!next_scroll_param) {
        return Promise.resolve();
      }
      return Promise.all([
        fetchAllLeads(ctx, { scroll_param: next_scroll_param, updated_after, updated_before }, { useFastlane: false }),
        saveLeads(ctx, { leads })
      ]);
    });
}
