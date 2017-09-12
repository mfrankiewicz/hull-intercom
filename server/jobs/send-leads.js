import _ from "lodash";

import postLeads from "../lib/lead/post-leads";

/**
 * Takes list of leads with fields and segment_ids set,
 * sends them to Intercom and tags them.
 */
export default function sendLeads(ctx, payload) {
  const { leads } = payload;
  const { syncAgent, intercomAgent } = ctx.service;

  ctx.client.logger.debug("sendLeads.preFilter", leads.length);
  const leadsToSave = leads.filter(lead => !syncAgent.userWithError(lead));
  leadsToSave.map(u => ctx.client.asUser(_.pick(u, ["id", "external_id", "email"])).logger.debug("outgoing.user.start"));
  const intercomLeadsToSave = leadsToSave.map(u => syncAgent.userMapping.getIntercomFields(u, ctx));

  ctx.client.logger.debug("sendLeads.filtered", intercomLeadsToSave.length);
  ctx.metric.increment("ship.outgoing.leads", intercomLeadsToSave.length);

  return syncAgent.syncShip()
    .then(() => {
      return postLeads(ctx, intercomLeadsToSave);
    })
    .then(res => {
      const savedleads = _.intersectionWith(leadsToSave, res, (lead, result) => {
        return lead["traits_intercom/lead_user_id"] === result.user_id;
      })
      .map(u => {
        const intercomData = _.find(res, { user_id: u["traits_intercom/lead_user_id"] });
        u["traits_intercom/id"] = intercomData.id;
        u["traits_intercom/tags"] = intercomData.tags.tags.map(t => t.name);

        ctx.client.asUser(_.pick(u, ["email", "id", "external_id"])).logger.info("outgoing.user.success");
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
        .then(() => syncAgent.groupUsersToTag(savedleads))
        .then(groupedleads => intercomAgent.tagUsers(groupedleads))
        .then(() => syncAgent.handleUserErrors(groupedErrors));
    });
}
