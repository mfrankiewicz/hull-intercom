import _ from "lodash";
import moment from "moment";
import Promise from "bluebird";

import TagMapping from "./tag-mapping";
import UserMapping from "./user-mapping";
import WebhookAgent from "./webhook-agent";
import EventsAgent from "./events-agent";

export default class SyncAgent {

  constructor(intercomAgent, hullAgent, ship, hostname, hullClient, instrumentationAgent) {
    this.ship = ship;
    this.hullAgent = hullAgent;
    this.intercomAgent = intercomAgent;
    this.hullClient = hullClient;
    this.logger = hullClient.logger;

    this.tagMapping = new TagMapping(intercomAgent, hullAgent, ship);
    this.userMapping = new UserMapping(ship);
    this.webhookAgent = new WebhookAgent(intercomAgent, hullAgent, ship, hostname);
    this.eventsAgent = new EventsAgent(hullAgent, this.tagMapping, ship, instrumentationAgent);
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
      .then(() => this.hullAgent.getSegments())
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

  /**
   * error {Array} [{
   *  data: {
   *    email: "email"
   *  },
   *  error: [
   *    message: "message"
   *  ]
   * }]
   */
  handleUserErrors(errors, users) {
    return Promise.map(errors, error => {
      const email = _.get(error, "data.email");
      const errorDetails = _.get(error, "error", []);
      const errorMessage = errorDetails.map(e => e.message).join(" ");
      if (_.find(errorDetails, { code: "conflict" })) {
        return _.find(users, { email });
      }

      return this.hullAgent.hullClient.as({ email }).traits({
        "intercom/import_error": errorMessage
      })
      .then(() => false);
    }).then(res => _.filter(res));
  }

  getUsersToSave(users) {
    return users.filter((u) => this.hullAgent.userComplete(u)
      && this.hullAgent.userWhitelisted(u)
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
        const ops = _.reduce(users, (o, user) => {
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
              this.hullClient.logger.error("segment not found", segment);
              return o;
            }
            o[segment.name] = o[segment.name] || [];
            return o[segment.name].push(userOp);
          });
          user.remove_segment_ids.map(segment_id => {
            const segment = _.find(segments, { id: segment_id });
            if (_.isEmpty(segment)) {
              this.hullClient.logger.error("segment not found", segment);
              return o;
            }
            o[segment.name] = o[segment.name] || [];
            return o[segment.name].push(_.merge({}, userOp, {
              untag: true
            }));
          });
          return o;
        }, {});
        return ops;
      });
  }

  /**
   * When the user is within the
   * @type {Array}
   */
  updateUserSegments(user, { add_segment_ids = [], remove_segment_ids = [] }) {
    if (this.hullAgent.userWhitelisted(user)) {
      user.segment_ids = _.uniq(_.concat(user.segment_ids || [], _.filter(add_segment_ids)));
      user.remove_segment_ids = _.filter(remove_segment_ids);
    } else {
      if (this.userAdded(user)) {
        user.segment_ids = [];
        user.remove_segment_ids = this.tagMapping.getSegmentIds();
      } else {
        return null;
      }
    }
    return user;
  }

  /**
   * Get information about last import done from intercom
   * @return {Promise}
   */
  getLastUpdatedAt() {
    return this.hullAgent.hullClient.get("/search/user_reports", {
      include: ["traits_intercom/updated_at"],
      sort: {
        "traits_intercom/updated_at": "desc"
      },
      per_page: 1,
      page: 1
    })
    .then((r) => {
      return r.data[0]["traits_intercom/updated_at"];
    })
    .catch(() => {
      return Promise.resolve(moment().utc().format());
    });
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
        return u.events.map(e => {
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
