import _ from "lodash";
import Promise from "bluebird";

import sendUsers from "./send-users";
import sendLeads from "./send-leads";

function batchHandler(ctx, source, segmentId) {
  return (users) => {
    const promises = [];
    const ignoreFilter = (source !== "connector");
    users = _.filter(users.map(u => {
      return ctx.service.syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] }, ignoreFilter);
    }));

    users.map(u => ctx.client.logger.debug("outgoing.user.start", _.pick(u, ["email", "id"])));

    const leads = users.filter((u) => u["traits_intercom/is_lead"] === true);

    users = users.filter((u) => !u["traits_intercom/is_lead"]);

    if (!_.isEmpty(leads)) {
      promises.push(sendLeads(ctx, { leads }));
    }

    if (!_.isEmpty(users)) {
      promises.push(sendUsers(ctx, { users }));
    }

    return Promise.all(promises);
  };
}


export default function handleBatch(ctx, payload) {
  const { segmentId, body, source } = payload;
  ctx.metric.event({
    title: "batch",
    text: JSON.stringify(payload.body)
  });
  ctx.client.logger.debug("outgoing.batch", { body });
  return ctx.client.utils.extract.handle({ body, batchSize: 100, handler: batchHandler(ctx, source, segmentId) });
}
