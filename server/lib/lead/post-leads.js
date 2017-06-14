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

  return Promise.map(leads, lead => {
    return service.intercomClient.post("/contacts")
      .send(lead)
      .then(response => {
        client.logger.info("outgoing.user.success", lead);
        return response.body;
      })
      .catch(err => {
        const fErr = service.intercomClient.handleError(err);
        client.logger.error("postLeads.error", fErr);
        return Promise.resolve(fErr);
      });
  }, { concurrency: 5 });
}
