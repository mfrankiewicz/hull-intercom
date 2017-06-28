// @flow
import Promise from "bluebird";

import postConvertLead from "../lib/lead/post-convert-lead";

export default function convertLeadsToUsers(ctx: Object, payload: Object): Promise {
  const { users } = payload;

  return Promise.map(users, (user) => {
    const ident = { id: user.id };
    return postConvertLead(ctx, user)
      .then(() => {
        return ctx.client.asUser(ident).traits({
          "intercom/is_lead": false
        });
      })
      .catch(fErr => {
        if (fErr.statusCode === 404) {
          return ctx.client.asUser(ident).traits({
            "intercom/is_lead": false
          });
        }
        return Promise.reject(fErr);
      });
  });
}
