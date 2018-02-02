import _ from "lodash";
import Promise from "bluebird";

import sendUsers from "./send-users";
import sendLeads from "./send-leads";

export default function handleBatch(ctx, messages) {
  let users = _.filter(messages.map((message) => {
    const { segments, user } = message;
    return ctx.service.syncAgent.updateUserSegments(user, { add_segment_ids: segments.map(s => s.id) }, true);
  }));

  const leads = users.filter(u => u["traits_intercom/is_lead"] === true);

  users = users.filter(u => !u["traits_intercom/is_lead"]);

  users.map(u => ctx.client.asUser(_.pick(u, ["email", "id"])).logger.debug("outgoing.user.start"));

  return (() => {
    if (!_.isEmpty(leads)) {
      return sendLeads(ctx, { leads });
    }
    return Promise.resolve();
  })()
    .then(() => {
      if (!_.isEmpty(users)) {
        return sendUsers(ctx, { users });
      }
      return Promise.resolve();
    });
}
