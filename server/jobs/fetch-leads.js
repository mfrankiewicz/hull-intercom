// @flow
import moment from "moment";
import Promise from "bluebird";

import saveLeads from "./save-leads";
import getRecentLeads from "../lib/lead/get-recent-leads";

export default function fetchLeads(ctx: Object, payload: Object) {
  const { ship, helpers } = ctx;
  const {
    fetch_all,
    updated_before,
    page = 1,
    count = 50
  } = payload;

  let {
    updated_after
  } = payload;

  // by default that operation works for interval based pooling
  if (!fetch_all && !updated_after && !updated_before) {
    updated_after = ship.private_settings.leads_last_fetched_at
      || moment().subtract(process.env.LEADS_FETCH_DEFAULT_HOURS || 24, "hours").format();
  }

  if (page === 1) {
    ctx.client.logger.info("incoming.job.start", { jobName: "fetch", type: "user", fetch_all, updated_after, updated_before });
  }

  return getRecentLeads(ctx, { page, count, updated_after, updated_before })
    .then(({ leads, hasMore }) => {
      ctx.client.logger.info("incoming.job.progress", { jobName: "fetch", stepName: "recent-leads", progress: ((page - 1) * count + leads.length) });
      const promises = [];
      if (hasMore) {
        promises.push(fetchLeads(ctx, {
          updated_after, updated_before, fetch_all, page: (page + 1), count
        }));
      }
      if (leads.length > 0) {
        promises.push(saveLeads(ctx, { leads }));
      }

      if (!hasMore || page % 5 === 0) {
        promises.push(helpers.updateSettings({
          leads_last_fetched_at: moment().format()
        }));
      }
      return Promise.all(promises);
    });
}
