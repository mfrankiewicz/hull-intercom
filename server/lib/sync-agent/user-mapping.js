import _ from "lodash";

export default class UserMapping {

  constructor(ship) {
    this.ship = ship;
    /* eslint-disable quote-props, no-multi-spaces, key-spacing */
    this.map = [
      { "name": "email",   "hull":"email",                "type": "string", "read_only": false },
      { "name": "id",      "hull":"traits_intercom/id",   "type": "string", "read_only": true  },
      { "name": "user_id", "hull":"external_id",          "type": "string", "read_only": false },
      { "name": "name",    "hull":"traits_intercom/name", "type": "string", "read_only": false },

      { "name": "updated_at",      "hull":"traits_intercom/updated_at",                "type": "date",      "read_only": false },
      { "name": "last_request_at", "hull":"traits_intercom/last_request_at",           "type": "date",      "read_only": false },
      { "name": "signed_up_at",    "hull":"traits_intercom/signed_up_at",              "type": "date",      "read_only": false },
      { "name": "created_at",      "hull":"traits_intercom/created_at",                "type": "date",      "read_only": false },
      { "name": "last_seen_ip",    "hull":"traits_intercom/last_seen_ip",              "type": "string",    "read_only": false },

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
    /* eslint-enable quote-props, no-multi-spaces, key-spacing */
  }

  computeHullTraits() {
    const fields = this.map.slice();
    const addFields = _.get(this.ship, "private_settings.sync_fields_to_hull");

    if (addFields && addFields.length > 0) {
      _.map(addFields, ({ name, hull }) => {
        if (name && hull) {
          fields.push({ name: `custom_attributes.${name}`, hull });
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
      const writableFields = _.filter(this.map, (writF) => !writF.read_only);
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
    return this.computeIntercomFields().map(f => f.name);
  }

  /**
   * @return Promise
   */
  getHullTraits(intercomUser = {}) {
    const hullTraits = _.reduce(this.computeHullTraits(), (traits, prop) => {
      if (_.has(intercomUser, prop.name) && prop.hull !== "external_id") {
        traits[prop.hull.replace(/^traits_/, "")] = _.get(intercomUser, prop.name);
      }
      return traits;
    }, {});


    const social_profiles = _.get(intercomUser, "social_profiles.social_profiles");

    if (social_profiles) {
      _.map(social_profiles, (social_profile) => {
        const spn = social_profile.name.toLowerCase();
        hullTraits[`intercom/${spn}_username`] = social_profile.username;
        hullTraits[`intercom/${spn}_id`] = social_profile.id;
        hullTraits[`intercom/${spn}_url`] = social_profile.url;
      });
    }

    ["companies", "segments", "tags"].forEach((k) => {
      const list = intercomUser[k] && intercomUser[k][k];
      if (list) {
        hullTraits[`intercom/${k}`] = _.uniq(_.compact(_.map(list, "name")));
      }
    });

    if (!_.isEmpty(intercomUser.name)) {
      hullTraits.name = { operation: "setIfNull", value: intercomUser.name };
    }

    return hullTraits;
  }

  /**
   * Build a object of attributes to send to Intercom
   * @see https://developers.intercom.com/reference#user-model
   * @param  {Object} hullUser
   * @return {Object}
   */
  getIntercomFields(hullUser, ctx) {
    const constrainedFields = ["custom_attributes.*"];
    const intercomFields = _.reduce(this.computeIntercomFields(), (fields, prop) => {
      if (_.has(hullUser, prop.hull)) {
        let value = "";
        // if field is standard and should not be overwritten
        const writableFields = _.filter(this.map, (f) => !f.read_only);
        if (!_.get(prop, "overwrite") && _.find(writableFields, { name: prop.name })) {
          const traitsIntercomField = _.find(writableFields, { name: prop.name }).hull;
          value = _.get(hullUser, traitsIntercomField) || _.get(hullUser, prop.hull);
        } else {
          value = _.get(hullUser, prop.hull);
        }

        const constraint = _.some(constrainedFields, c => prop.name.match(new RegExp(c)));
        if (_.isArray(value) && !constraint) {
          value = value.join(",");
        } else if (_.isArray(value) && constraint) {
          const trimmed = this.joinWithLimit(value, ",", 255);
          // if we had to trim the value, then we issue a warning
          if (trimmed.length < value.join(",").length) {
            ctx.client.logger.warning("user.outgoing.warning", `Field ${prop.hull} is too long. Maximum length is 255 when current value is ${value.join(",")}`);
          }
          value = trimmed;
        } else if (constraint) {
          // not an array but still constrained
          value = this.joinWithLimit([value], ",", 255);
        }

        _.set(fields, prop.name, value);
      }
      return fields;
    }, {});

    if (_.get(hullUser, "traits_intercom/id")) {
      _.set(intercomFields, "id", _.get(hullUser, "traits_intercom/id"));
    }

    if (_.get(hullUser, "email")) {
      _.set(intercomFields, "email", _.toLower(_.get(hullUser, "email")));
    }

    if (_.get(hullUser, "external_id")) {
      _.set(intercomFields, "user_id", _.get(hullUser, "external_id"));
    }

    return intercomFields;
  }

  /**
   * @see https://developers.intercom.com/reference#section-user-object
   * @param  {Object} user Intercom User
   * @return {Object}
   */
  getIdentFromIntercom(user) {
    const ident = {};

    if (_.get(user, "email")) {
      ident.email = user.email;
    }

    if (_.get(user, "id")) {
      ident.anonymous_id = `intercom:${user.id}`;
    }

    if (_.get(user, "user_id")) {
      ident.external_id = user.user_id;
    }

    return ident;
  }

  joinWithLimit(values, separator, limit) {
    return values.reduce((memo, v) => {
      // initial
      if (memo.length === 0 && v.length <= limit) {
        return v;
      }
      if ((memo + separator + v).length <= limit) {
        return [memo, v].join(separator);
      }
      return memo;
    }, "");
  }
}
