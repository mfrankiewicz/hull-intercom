// @flow
import _ from "lodash";
import Promise from "bluebird";

export default function postLeads(ctx: Object, leads: Array<Object>): Promise {
  const { client, service } = ctx;
  if (_.isEmpty(leads)) {
    client.logger.debug("postLeads.emptyList");
    return Promise.resolve();
  }

  client.logger.debug("postLeads", leads.length);

  return Promise.map(leads, (lead) => {
    return service.intercomClient.post("/contacts", lead)
      .then(response => response.body)
      .catch((err) => {
        const fErr = service.intercomClient.handleError(err);
        client.asUser({ email: lead.email, external_id: lead.user_id }).logger.error("outgoing.user.error", fErr);
        return Promise.resolve(fErr);
      });
  }, { concurrency: parseInt(process.env.LEADS_API_REQUEST_CONCURRENCY, 10) || 1 });
}
