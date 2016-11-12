import _ from "lodash";

import TagMapping from "./tag-mapping";
import UserMapping from "./user-mapping";

export default class SyncAgent {

  constructor(intercomAgent, hullAgent, ship) {
    this.ship = ship;
    this.hullAgent = hullAgent;
    this.intercomAgent = intercomAgent;
    this.tagMapping = new TagMapping(ship);
    this.userMapping = new UserMapping(ship);
  }

  getUsersToSave(users) {
    return users.filter((u) => this.hullAgent.userComplete(u)
      && this.hullAgent.userWhitelisted(u)
      && !this.intercomAgent.userAdded(u)
      && !this.intercomAgent.userWithError(u));
  }

  getUsersToTag(users) {
    return users.filter((u) => this.hullAgent.userWhitelisted(u)
      && this.intercomAgent.userAdded(u)
      && !this.intercomAgent.userWithError(u));
  }

}
