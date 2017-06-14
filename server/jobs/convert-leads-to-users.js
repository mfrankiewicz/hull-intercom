// @flow
import Promise from "bluebird";

import getLeadIdent from "../lib/lead/get-lead-ident";
import postConvertLead from "../lib/lead/post-convert-lead";

export default function convertLeadsToUsers(ctx: Object, payload: Object): Promise {
  const { users } = payload;

  return Promise.map(users, (user) => {
    return postConvertLead(ctx, user)
      .then(() => {
        const ident = { id: user.id };
        console.log("--------", "client.asUser", ident, ".traits");
        ctx.client.asUser(ident).traits({
          "intercom/is_lead": false
        });
      });
  });
}
