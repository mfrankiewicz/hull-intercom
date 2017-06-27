import _ from "lodash";
import Promise from "bluebird";

import sendUsers from "./send-users";
import sendLeads from "./send-leads";

function batchHandler(ctx, source, segmentId) {
  return (users) => {
    const ignoreFilter = (source !== "connector");
    users = _.filter(users.map(u => {
      return ctx.service.syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] }, ignoreFilter);
    }));

    users.map(u => ctx.client.logger.debug("outgoing.user.start", _.pick(u, ["email", "id"])));

    const leads = users.filter((u) => u["traits_intercom/is_lead"] === true);

    users = users.filter((u) => !u["traits_intercom/is_lead"]);

    return Promise.all([
      sendUsers(ctx, { users }),
      sendLeads(ctx, { leads }),
    ]);
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
