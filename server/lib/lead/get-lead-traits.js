// @flow
// import _ from "lodash";

export default function getLeadsTraits(ctx: Object, mapping: Array<Object>, lead: Object): Object {
  const traits = {};

  traits["intercom/type"] = "lead";

  console.log(mapping, lead);

  return traits;
}
