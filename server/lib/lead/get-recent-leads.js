// @flow
import _ from "lodash";
import moment from "moment";


export default function getRecentLeads(ctx: Object, options: Object): Object {
  const { intercomClient } = ctx.service;
  const { page, count, updated_after, updated_before } = options;

  return intercomClient.get("/contacts")
    .query({
      per_page: count,
      page,
      order: "desc",
      sort: "updated_at"
    })
    .then(response => {
      const originalLeads = _.get(response, "body.contacts", []);
      const totalPages = _.get(response, "body.total_pages");

      const leads = originalLeads
      .filter(u => {
        if (!updated_after) {
          return true;
        }
        return moment(u.updated_at, "X")
            .isAfter(updated_after);
      })
      .filter(u => {
        if (!updated_before) {
          return true;
        }
        return moment(u.updated_at, "X")
            .isBefore(updated_before);
      });

      return {
        hasMore: leads.length === originalLeads.length && page < totalPages,
        leads
      };
    });
}
