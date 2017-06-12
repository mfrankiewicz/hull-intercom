// @flow
import Promise from "bluebird";

import getLeadIdent from "../lib/lead/get-lead-ident";

export default function convertLeadsToUsers(ctx: Object, leads: Array<Object>): Promise {
  const { client } = ctx;

  return Promise.map(leads, (lead) => {
    const ident = getLeadIdent(ctx, lead);
    const traits = ctx.service.syncAgent.userMapping.getHullTraits(lead);
    traits["intercom\type"] = "user";
    return client.asUser(ident).traits(traits);
  });
}
