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
      { "name": "pseudonym",                "hull":"traits_intercom/pseudonym",                 "type": "true",      "read_only": true },
      { "name": "anonymous",                "hull":"traits_intercom/anonymous",                 "type": "boolean",   "read_only": true },

      { "name": "avatar.image_url", "hull":"traits_intercom/avatar",                    "type": "string",    "read_only": true },

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
          fields.push({ name: `custom_attributes.${name}`, hull: hull });
        }
      });
    }
    return fields;
  }

  computeIntercomFields() {
    let fields = _.get(this.ship, "private_settings.sync_fields_to_intercom") || [];

    fields = fields.map(f => {
      const hull = f.hull;

      let name = `custom_attributes.${f.name}`;

      // selected field is standard one -> save it as standard
      const writableFields = _.filter(this.map, (f) => !f.read_only);
      if (_.find(writableFields, { name: f.name })) {
        name = f.name;
      }

      return { name, hull };
    });

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

    return hullTraits;
  }

  getIntercomFields(hullUser, { setUserId = false } = {}) {
    const intercomFields = _.reduce(this.computeIntercomFields(), (fields, prop) => {
      if (_.get(hullUser, prop.hull)) {
        // if field is standard and should not be overwritten
        const writableFields = _.filter(this.map, (f) => !f.read_only);
        if (!_.get(prop, "overwrite") && _.find(writableFields, { name: prop.name })) {
          const traitsIntercomField = _.find(writableFields, { name: prop.name }).hull;
          _.set(fields, prop.name, _.get(hullUser, traitsIntercomField) || _.get(hullUser, prop.hull));
        } else {
          _.set(fields, prop.name, _.get(hullUser, prop.hull));
        }
      }
      return fields;
    }, {});

    _.set(intercomFields, "id", _.get(hullUser, "traits_intercom/id"));
    _.set(intercomFields, "email", _.get(hullUser, "email"));

    if (setUserId) {
      _.set(intercomFields, "user_id", _.get(hullUser, "id"));
    }

    return intercomFields;
  }
}
