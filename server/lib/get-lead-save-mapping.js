// @flow
// import _ from "lodash";

const defaultMapping = [{
  hull: "intercom/type",
  intercom: "lead",
}];

export default function getLeadSaveMapping(ctx: Object): Array<Object> {
  console.log(ctx.ship);
  return defaultMapping;
}
