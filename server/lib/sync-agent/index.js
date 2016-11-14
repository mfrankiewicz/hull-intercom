import _ from "lodash";

import TagMapping from "./tag-mapping";
import UserMapping from "./user-mapping";
import WebhookAgent from "./webhook-agent"

export default class SyncAgent {

  constructor(intercomAgent, hullAgent, ship, hostname) {
    this.ship = ship;
    this.hullAgent = hullAgent;
    this.intercomAgent = intercomAgent;
    this.tagMapping = new TagMapping(intercomAgent, hullAgent, ship);
    this.userMapping = new UserMapping(ship);
    this.webhookAgent = new WebhookAgent(intercomAgent, hullAgent, ship, hostname);
  }

  /**
   *
   */
  userAdded(user) {
    return !_.isEmpty(user["intercom/id"]);
  }

  /**
   *
   */
  userWithError(user) {
    return !_.isEmpty(user["traits_mailchimp/import_error"]);
  }

  getUsersToSave(users) {
    return users.filter((u) => this.hullAgent.userComplete(u)
      && this.hullAgent.userWhitelisted(u)
      && !this.userAdded(u)
      && !this.userWithError(u));
  }

  getUsersToTag(users) {
    return users.filter((u) => this.hullAgent.userWhitelisted(u)
      && this.userAdded(u)
      && !this.userWithError(u));
  }

  groupUsersToTag(users) {
    return this.hullAgent.getSegments()
      .then(segments => {
        const ops =  _.reduce(users, (o, user) => {

          user.segment_ids.map(segment_id => {
            const segment = _.find(segments, { id: segment_id });
            o[segment.name] = o[segment.name] || [];
            o[segment.name].push({
              email: user.email
            });
          });
          return o;
        }, {});
        return ops;
      });
  }

}
