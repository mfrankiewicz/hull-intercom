import _ from "lodash";

export default class UserMapping {

  constructor(ship) {
    this.ship = ship;
    this.map = [
      { "name": "email",   "hull":"email",                "type": "string", "read_only": false },
      { "name": "id",      "hull":"traits_intercom/id",   "type": "string", "read_only": true  },
      { "name": "user_id", "hull":"external_id",          "type": "string", "read_only": false },
      { "name": "name",    "hull":"traits_intercom/name", "type": "string", "read_only": false },

      { "name": "updated_at",      "hull":"traits_intercom/updated_at",                "type": "date",      "read_only": false },
      { "name": "last_request_at", "hull":"traits_intercom/last_request_at",           "type": "date",      "read_only": false },
      { "name": "signed_up_at",    "hull":"traits_intercom/signed_up_at",              "type": "date",      "read_only": false },
      { "name": "created_at",      "hull":"traits_intercom/created_at",                "type": "date",      "read_only": false },
      { "name": "last_seen_ip" ,   "hull":"traits_intercom/last_seen_ip",              "type": "string",    "read_only": false },

      { "name": "unsubscribed_from_emails", "hull":"traits_intercom/unsubscribed_from_emails",  "type": "boolean",   "read_only": false },
      { "name": "session_count",            "hull":"traits_intercom/session_count",             "type": "number",    "read_only": true  },
      { "name": "pseudonym",                "hull":"traits_intercom/pseudonym",                 "type": "true",      "read_only": false },
      { "name": "anonymous",                "hull":"traits_intercom/anonymous",                 "type": "boolean",   "read_only": false },

      { "name": "avatar.image_url", "hull":"traits_intercom/avatar",                    "type": "string",    "read_only": false },

      { "name": "location_data.city_name",      "hull":"traits_intercom/location_city_name",        "type": "string",    "read_only": true },
      { "name": "location_data.continent_code", "hull":"traits_intercom/location_continent_code",   "type": "string",    "read_only": true },
      { "name": "location_data.country_code",   "hull":"traits_intercom/location_country_code",     "type": "string",    "read_only": true },
      { "name": "location_data.country_name",   "hull":"traits_intercom/location_country_name",     "type": "string",    "read_only": true },
      { "name": "location_data.latitude",       "hull":"traits_intercom/location_latitude",         "type": "number",    "read_only": true },
      { "name": "location_data.longitude",      "hull":"traits_intercom/location_longitude",        "type": "number",    "read_only": true },
      { "name": "location_data.postal_code",    "hull":"traits_intercom/location_postal_code",      "type": "string",    "read_only": true },
      { "name": "location_data.region_name",    "hull":"traits_intercom/location_region_name",      "type": "string",    "read_only": true },
      { "name": "location_data.timezone",       "hull":"traits_intercom/location_timezone",         "type": "string",    "read_only": true }
    ];
  }

  computeHullTraits() {
    const fields = this.map.slice();
    const addFields = _.get(this.ship, 'private_settings.sync_fields_to_hull');

    if (addFields && addFields.length > 0) {
      addFields.map(({ name, hull }) => {
        if (name && hull) {
          fields.push({ name, hull: hull.value/*.replace(/^traits_/, "")*/ });
        }
      });
    }
    return fields;
  }

  computeIntercomFields() {
    let fields = _.get(this.ship, "private_settings.sync_fields_to_intercom") || [];

    fields = fields.map(f => {
      const hull = f.hull.value; //.value.replace(/^traits_/, "");
      const name = `custom_attributes.${f.name}`;
      return { name, hull };
    });

    if (!_.find(fields, { name: "email" })) {
      fields.push({ name: "email", hull: "email" });
    }

    return fields;
  }

  getHullTraitsKeys() {
    return this.computeHullTraits().map(f => f.hull.replace(/^traits_/, ""));
  }

  getIntercomFieldsKeys() {
    return this.computeIntercomTraits().map(f => f.name);
  }

  /**
   * @return Promise
   */
  getHullTraits(intercomUser) {
    const hullTraits = _.reduce(this.computeHullTraits(), (traits, prop) => {
      if (_.get(intercomUser, prop.name)) {
        traits[prop.hull.replace(/^traits_/, "")] = _.get(intercomUser, prop.name);
      }
      return traits;
    }, {});

    _.map(intercomUser.social_profiles.social_profiles, (social_profile) => {
      const spn = social_profile.name.toLowerCase();
      hullTraits[`intercom/${spn}_username`] = social_profile.username;
      hullTraits[`intercom/${spn}_id`] = social_profile.id;
      hullTraits[`intercom/${spn}_url`] = social_profile.url;
    });

    hullTraits["intercom/companies"] = _.map(intercomUser.companies.companies, "name").join(";");
    hullTraits["intercom/segments"] = _.map(intercomUser.segments.segments, "name").join(";");
    hullTraits["intercom/tags"] = _.map(intercomUser.tags.tags, "name").join(";");
console.log(hullTraits);
    return hullTraits;
  }

  getIntercomFields(hullUser) {
    const intercomFields = _.reduce(this.computeIntercomFields(), (fields, prop) => {
      if (_.get(hullUser, prop.hull)) {
        _.set(fields, prop.name, _.get(hullUser, prop.hull));
      }
      return fields;
    }, {});
    console.log(intercomFields);
    return intercomFields;
  }
}
