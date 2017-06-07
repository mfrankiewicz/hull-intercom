import _ from "lodash";

/**
 * Takes list of leads with fields and segment_ids set,
 * sends them to Intercom and tags them.
 */
export default function sendLeads(ctx, payload) {
  const { leads } = payload;
  const { syncAgent, intercomAgent } = ctx.service;

  ctx.client.logger.debug("sendleads.preFilter", leads.length);
  const leadsToSave = syncAgent.getleadsToSave(leads);
  const intercomleadsToSave = leadsToSave.map(u => syncAgent.userMapping.getIntercomFields(u));

  ctx.client.logger.debug("sendleads.filtered", intercomleadsToSave.length);
  ctx.metric.increment("ship.outgoing.leads", intercomleadsToSave.length);

  return syncAgent.syncShip()
    .then(() => intercomAgent.sendleads(intercomleadsToSave))
    .then(res => {
      const savedleads = _.intersectionBy(leadsToSave, res, "email")
        .map(u => {
          const intercomData = _.find(res, { email: u.email });
          u["traits_intercom/id"] = intercomData.id;
          u["traits_intercom/tags"] = intercomData.tags.tags.map(t => t.name);

          ctx.client.logger.info("outgoing.user.success", _.pick(u, ["email", "id", "external_id"]));
          return u;
        });
      const errors = _.filter(res, { body: { type: "error.list" } });

      const groupedErrors = errors.map(errorReq => {
        return {
          data: errorReq.req.data,
          error: errorReq.body.errors
        };
      });

      return syncAgent.sendEvents(savedleads)
        .then(() => syncAgent.groupleadsToTag(savedleads))
        .then(groupedleads => intercomAgent.tagleads(groupedleads))
        .then(() => syncAgent.handleUserErrors(groupedErrors));
    });
}
