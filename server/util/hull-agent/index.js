import _ from "lodash";
import ExtractAgent from "./extract-agent";

export default class HullAgent {

  constructor(ship, hullClient, shipCache) {
    this.hullClient = hullClient;
    this.ship = ship;
    this.shipCache = shipCache;

    this.extractAgent = new ExtractAgent();
  }

  updateShipSettings(newSettings) {
    return this.hullClient.get(this.ship.id)
      .then(ship => {
        this.ship = ship;
        const private_settings = { ...this.ship.private_settings, ...newSettings };
        this.ship.private_settings = private_settings;
        console.log(private_settings);
        return this.hullClient.put(this.ship.id, { private_settings });
      })
      .then((ship) => {
        return this.shipCache.del(this.ship.id)
          .then(() => {
            return ship;
          });
      });
  }

  /**
   *
   */
  userComplete(user) {
    return !_.isEmpty(user.email);
  }

  /**
   *
   */
  userWhitelisted(user) {
    const segmentIds = _.get(this.ship, "private_settings.synchronized_segments", []);
    if (segmentIds.length === 0) {
      return true;
    }
    return _.intersection(segmentIds, user.segment_ids).length > 0;
  }

  getSegments() {
    return this.hullClient.get("/segments");
  }

  updateUser(member) {
    const traits = this.getUserTraitsForMember(member);
    console.warn("updateUser", traits.email);
    const { email, unique_email_id } = traits;
    const ident = { email };
    if (unique_email_id) {
      ident.anonymous_id = `mailchimp:${unique_email_id}`;
    }

    return this.hullClient
      .as(ident)
      .traits(traits, { source: "mailchimp" });
  }

  getExtractFields() {
    const traits = this.mailchimpFields.map(path => {
      const trait = _.last(path.split("."));
      return `traits_mailchimp/${trait}`;
    });
    const props = [
      "traits_mailchimp/import_error",
      "traits_mailchimp/last_activity_at",
      "id",
      "email",
      "first_name",
      "last_name"
    ];
    return props.concat(traits);
  }

}
