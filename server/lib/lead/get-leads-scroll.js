import Promise from "bluebird";
import _ from "lodash";
import moment from "moment";

export default function getLeadsScroll(ctx, scroll_param = null, updated_after, updated_before) {
  const { client } = ctx;
  const { intercomClient } = ctx.service;
  return intercomClient.get("/contacts/scroll")
  .query({ scroll_param })
  .then(response => {
    let { contacts } = response.body;
    const { scroll_param: next_scroll_param } = response.body;

    if (updated_after && moment(updated_after).isValid()) {
      contacts = contacts.filter((u) => {
        return moment(u.updated_at, "X")
          .isAfter(updated_after);
      });
    }

    if (updated_before && moment(updated_before).isValid()) {
      contacts = contacts.filter((u) => {
        return moment(u.updated_at, "X")
          .isBefore(updated_before);
      });
    }

    return { leads: contacts, scroll_param: next_scroll_param };
  })
  .catch(err => {
    const fErr = intercomClient.handleError(err);

    if (_.get(fErr, "body.errors[0].code") === "scroll_exists") {
      client.logger.error("incoming.job.error", { jobName: "fetchAllLeads", errors: "Trying to perform two separate scrolls" });
      return Promise.resolve([]);
    }

    if (_.get(fErr, "body.errors[0].code") === "not_found") {
      client.logger.warn("incoming.job.warning", { jobName: "fetchAllLeads", errors: "Scroll expired, what could mean the end of the list" });
      return Promise.resolve([]);
    }

    // handle errors which may happen here
    return Promise.reject(fErr);
  });
}
