import ExtractAgent from "./extract-agent";

export default class HullAgent {

  constructor(deps) {
    this.extractAgent = new ExtractAgent(deps);
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
