// @flow
import _ from "lodash";

export default function getTagEventTraits(ctx: Object, user: Object, allTags: Array<Object>): Object {
  const tags = user.tags.tags.map(t => {
    if (!t.name) {
      t = _.find(allTags, { id: t.id });
    }
    return t.name;
  });
  const traits = {};
  traits["intercom/tags"] = tags;
  return traits;
}
