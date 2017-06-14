// @flow
import _ from "lodash";

export default function isTagEvent(ctx: Object, intercomEvent: Object): boolean {
  const { tagMapping } = ctx.service.syncAgent;
  if (_.includes(["user.tag.created", "user.tag.deleted"], intercomEvent.topic)
    && _.includes(tagMapping.getTagIds(), intercomEvent.data.item.tag.id)) {
    return true;
  }
  return false;
}
