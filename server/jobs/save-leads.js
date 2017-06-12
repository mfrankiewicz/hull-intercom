// @flow
import _ from "lodash";

import getLeadIdent from "../lib/lead/get-lead-ident";

/**
 * Gets a list of Intercom's leads and saves them as users to hull
 */
export default function saveLeads(ctx: Object, leads:Array<Object> = []): Promise<String> {
  const { client } = ctx;
  return Promise.all(_.map(leads, (lead) => {
    const ident = getLeadIdent(ctx, lead);
    const traits = ctx.service.syncAgent.userMapping.getHullTraits(lead);
    traits["intercom/type"] = "lead";

    return client
      .asUser(ident)
      .traits(traits);
  }));
}
