// @flow
import _ from "lodash";

import getLeadTraits from "../lib/get-lead-traits";
import getLeadIdent from "../lib/get-lead-ident";
import getLeadSaveMapping from "../lib/get-lead-save-mapping";

/**
 * Gets a list of Intercom's leads and saves them as users to hull
 */
export default function saveLeads(ctx: Object, leads:Array<Object> = []): Promise<String> {
  const { client } = ctx;
  const mapping = getLeadSaveMapping(ctx);
  return Promise.all(_.map(leads, (lead) => {
    const ident = getLeadIdent(ctx, lead);
    const traits = getLeadTraits(ctx, mapping, lead);

    return client
      .asUser(ident)
      .traits(traits);
  }));
}
