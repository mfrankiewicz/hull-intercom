import _ from "lodash";

export default class UserMapping {

  constructor(ship) {
    this.ship = ship;
    this.map = [
      { intercom: "id", hull: "intercom/id" },
      { intercom: "email", hull: "email" },
      { intercom: "name", hull: "intercom/name" },
      { intercom: "avatar.image_url", hull: "intercom/avatar_image_url" },
      { intercom: "location_data.latitude", hull: "intercom/latitude" },
      { intercom: "location_data.longitude", hull: "intercom/longitude" },
      { intercom: "last_request_at", hull: "intercom/last_request_at" },
      { intercom: "last_seen_ip", hull: "intercom/last_seen_ip" },
      { intercom: "created_at", hull: "intercom/created_at" },
      { intercom: "remote_created_at", hull: "intercom/remote_created_at" },
      { intercom: "signed_up_at", hull: "intercom/signed_up_at" },
      { intercom: "updated_at", hull: "intercom/updated_at" },
      { intercom: "session_count", hull: "intercom/session_count" },
      { intercom: "unsubscribed_from_emails", hull: "intercom/unsubscribed_from_emails" },
    ];
  }

  computeHullTraits() {
    const fields = this.map.slice();
    return this.map;
    const addFields = _.get(this.ship, 'private_settings.sync_fields_to_hull');

    if (addFields && addFields.length > 0) {
      addFields.map(({ intercom, hull }) => {
        if (intercom && hull) {
          fields.push({ intercom, hull: hull.replace(/^traits_/, "") });
        }
      });
    }
    return fields;
  }

  computeIntercomFields() {
    return this.map;
    const fields = _.get(this.ship, "private_settings.sync_fields_to_intercom") || [];
    if (!_.find(fields, { intercom: "email" })) {
      fields.push({ intercom: "email", hull: "email" });
    }
    return fields.map(f => {
      const hull = f.hull.replace(/^traits_/, "");
      const intercom = f.intercom;
      return { intercom, hull };
    });
  }

  getHullTraitsKeys() {
    return this.computeHullTraits().map(f => f.hull);
  }

  getIntercomFieldsKeys() {
    return this.computeIntercomTraits().map(f => f.intercom);
  }

  /**
   * @return Promise
   */
  getHullTraits(intercomUser) {
    const hullTraits = _.reduce(this.computeHullTraits(), (traits, prop) => {
      if (_.get(intercomUser, prop.intercom)) {
        traits[prop.hull] = _.get(intercomUser, prop.intercom);
      }
      return traits;
    }, {});
    console.log("intercom => hull", intercomUser, hullTraits);
    return hullTraits;
  }

  getIntercomFields(hullUser) {
    const intercomFields = _.reduce(this.computeIntercomFields(), (fields, prop) => {
      if (_.get(hullUser, prop.hull)) {
        fields[prop.intercom] = _.get(hullUser, prop.hull);
      }
      return fields;
    }, {});
    console.log("hull => intercom", hullUser, intercomFields);
    return intercomFields;
  }
}
