import TagMapping from "./tag-mapping";

export default class SyncAgent {

  constructor(deps) {
    this.tagMapping = new TagMapping(deps);
    this.ship = deps.ship;
  }

  isConfigured() {

  }

  saveUsers(req) {

  }

}
