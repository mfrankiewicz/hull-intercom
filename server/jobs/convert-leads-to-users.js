// @flow
import Promise from "bluebird";

// import getLeadIdent from "../lib/lead/get-lead-ident";
import postConvertLead from "../lib/lead/post-convert-lead";

export default function convertLeadsToUsers(ctx: Object, payload: Object): Promise {
  const { leads } = payload;

  return Promise.map(leads, (lead) => {
    return postConvertLead(ctx, lead);
  });
}
