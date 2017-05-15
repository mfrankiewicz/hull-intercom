import _ from "lodash";
import moment from "moment";
import Promise from "bluebird";

import TagMapping from "./tag-mapping";
import UserMapping from "./user-mapping";
import WebhookAgent from "./webhook-agent";
import EventsAgent from "./events-agent";

export default class SyncAgent {

  constructor(intercomAgent, client, segments, metric, ship, helpers, hostname) {
    this.ship = ship;
    this.segments = segments;
    this.intercomAgent = intercomAgent;
    this.client = client;
    this.logger = client.logger;

    this.tagMapping = new TagMapping(intercomAgent, ship, helpers);
    this.userMapping = new UserMapping(ship);
    this.webhookAgent = new WebhookAgent(intercomAgent, client, ship, helpers, hostname);
    this.eventsAgent = new EventsAgent(this.tagMapping, this.userMapping, client, metric);
  }

  isConfigured() {
    return this.intercomAgent.intercomClient.ifConfigured();
  }

  /**
   * Makes sure that the Intercom account basic settings is in sync with Hull.
   * That means tags to represent segments and webhook for events capturing.
   */
  syncShip() {
    return this.webhookAgent.ensureWebhook()
      .then(() => this.segments)
      .then((segments) => this.tagMapping.sync(segments));
  }

  /**
   *
   */
  userAdded(user) {
    return !_.isEmpty(user["traits_intercom/id"]);
  }

  /**
   *
   */
  userWithError(user) {
    return !_.isEmpty(user["traits_intercom/import_error"]);
  }

  userWhitelisted(user) {
    const segmentIds = _.get(this.ship, "private_settings.synchronized_segments", []);
    return _.intersection(segmentIds, user.segment_ids).length > 0;
  }

  /**
   * @param {Array} error [{
   *  data: {
   *    email: "email"
   *  },
   *  error: [
   *    message: "message"
   *  ]
   * }]
   * @param {Object} users
   * @return {Promise}
   */
  handleUserErrors(errors) {
    return Promise.map(errors, error => {
      let errorDetails = _.get(error, "error", []);
      if (!_.isArray(errorDetails)) {
        errorDetails = [errorDetails];
      }

      const errorMessage = errorDetails.map(e => e.message).join(" ");

      if (_.find(errorDetails, { code: "conflict" })) {
        this.client.logger.error("saving user error", { errorDetails });
      }

      const ident = this.userMapping.getIdentFromIntercom(error.data);

      this.client.logger.info("outgoing.user.error", _.merge(ident, { errors: errorDetails }));
      return this.client.asUser(ident).traits({
        "intercom/import_error": errorMessage
      });
    });
  }

  getUsersToSave(users) {
    return users.filter((u) => !_.isEmpty(u.email)
      && !this.userWithError(u));
  }

  getUsersToTag(users) {
    return users.filter((u) => this.userWhitelisted(u)
      && this.userAdded(u)
      && !this.userWithError(u));
  }

  groupUsersToTag(users) {
    return Promise.resolve(this.segments)
      .then(segments => {
        return _.reduce(users, (o, user) => {
          const existingUserTags = _.intersection(user["traits_intercom/tags"], segments.map(s => s.name));

          const userOp = {};
          if (!_.isEmpty(user["traits_intercom/id"])) {
            userOp.id = user["traits_intercom/id"];
          } else if (!_.isEmpty(user.email)) {
            userOp.email = user.email;
          } else {
            return o;
          }
          user.segment_ids.map(segment_id => {
            const segment = _.find(segments, { id: segment_id });
            if (_.isEmpty(segment)) {
              this.client.logger.debug("segment not found", segment);
              return o;
            }
            if (_.includes(existingUserTags, segment.name)) {
              this.client.logger.debug("user.add_segment.skip", segment.name);
              return null;
            }
            o[segment.name] = o[segment.name] || [];
            return o[segment.name].push(userOp);
          });
          user.remove_segment_ids.map(segment_id => {
            const segment = _.find(segments, { id: segment_id });
            if (_.isEmpty(segment)) {
              this.client.logger.debug("segment not found", segment);
              return o;
            }
            if (!_.includes(existingUserTags, segment.name)) {
              this.client.logger.debug("user.remove_segment.skip", segment.name);
              return null;
            }
            o[segment.name] = o[segment.name] || [];
            return o[segment.name].push(_.merge({}, userOp, {
              untag: true
            }));
          });
          return o;
        }, {});
      });
  }

  /**
   * When the user is within the
   * @type {Array}
   */
  updateUserSegments(user, { add_segment_ids = [], remove_segment_ids = [] }, ignoreFilter = false) {
    if (this.userWhitelisted(user) || ignoreFilter === true) {
      user.segment_ids = _.uniq(_.concat(user.segment_ids || [], _.filter(add_segment_ids)));
      user.remove_segment_ids = _.filter(remove_segment_ids);
    } else {
      return null;
    }
    return user;
  }

  /**
   * Sends Hull events to Intercom. Only for users with `traits_intercom/id` and events matching
   * the set filter.
   * @param  {Array} users Hull users with `events` property supplied
   * @return {Promise}
   */
  sendEvents(users) {
    if (this.ship.private_settings.send_events_enabled !== true) {
      this.logger.debug("sendEvents.send_events_enabled", this.ship.private_settings.send_events_enabled);
      return Promise.resolve();
    }

    const events = _.chain(users)
      .tap(u => this.logger.debug("sendEvents.users", u.length))
      .filter(u => !_.isUndefined(u["traits_intercom/id"]))
      .tap(u => this.logger.debug("sendEvents.users.filtered", u.length))
      .map(u => {
        return _.get(u, "events", []).map(e => {
          e.user = {
            id: u["traits_intercom/id"]
          };
          return e;
        });
      })
      .flatten()
      .tap(e => this.logger.debug("sendEvents.events", e.length))
      .filter(e => _.includes(this.ship.private_settings.send_events, e.event))
      .filter(e => e.event_source !== "intercom")
      .tap(e => this.logger.debug("sendEvents.events.filtered", e.length))
      .map(ev => {
        const data = {
          event_name: ev.event,
          created_at: moment(ev.created_at).format("X"),
          id: ev.user.id,
          metadata: ev.properties
        };
        this.logger.info("outgoing.event", data);
        return data;
      })
      .value();

    return this.intercomAgent.sendEvents(events)
      .catch(err => {
        this.logger.error("outgoing.event.error", err);
        return Promise.reject(err);
      });
  }

}
