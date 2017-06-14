// @flow
import Promise from "bluebird";

import postConvertLead from "../lib/lead/post-convert-lead";

export default function convertLeadsToUsers(ctx: Object, payload: Object): Promise {
  const { users } = payload;

  return Promise.map(users, (user) => {
    return postConvertLead(ctx, user)
      .then(() => {
        const ident = { id: user.id };
        ctx.client.asUser(ident).traits({
          "intercom/is_lead": false
        });
      });
  });
}
