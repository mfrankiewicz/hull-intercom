// @flow
import Promise from "bluebird";

import getLeadTraits from "../lib/lead/get-lead-traits";
import getLeadIdent from "../lib/lead/get-lead-ident";
import getLeadSaveMapping from "../lib/lead/get-lead-save-mapping";

export default function convertLeadsToUsers(ctx: Object, leads: Array<Object>): Promise {
  const { client } = ctx;
  const mapping = getLeadSaveMapping(ctx);

  return Promise.map(leads, (lead) => {
    const ident = getLeadIdent(ctx, lead);
    const traits = getLeadTraits(ctx, mapping, lead);
    traits["intercom\type"] = "user";
    return client.asUser(ident).traits(traits);
  });
}
