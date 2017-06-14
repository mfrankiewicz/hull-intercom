// @flow
import Promise from "bluebird";
import _ from "lodash";

export default function getUsersLeadsMatching(ctx: Object, leads: Array<Object>): Promise {
  const filteredLeads = leads.filter(l => !_.isEmpty(l.email));
  return Promise.resolve(filteredLeads);
}
