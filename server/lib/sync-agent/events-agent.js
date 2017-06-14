import _ from "lodash";
import Promise from "bluebird";

import getLeadIdent from "../lead/get-lead-ident";

export default class EventsAgent {

  constructor(tagMapping, userMapping, client, metric) {
    this.client = client;
    this.logger = client.logger;
    this.tagMapping = tagMapping;
    this.metric = metric;
    this.userMapping = userMapping;

    this.map = [
      {
        intercom: "conversation.user.created",
        eventName: "User started conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {
            initiated: "user"
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.user.replied",
        eventName: "User replied to conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {
            initiated: "user"
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.admin.replied",
        eventName: "Admin replied to conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {
            initiated: "admin"
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.admin.single.created",
        eventName: "Admin started conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {
            initiated: "admin"
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.admin.assigned",
        eventName: "Admin assigned conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (event) => {
          return {
            to: _.get(event, "data.item.user.id"),
            admin: _.get(event, "data.item.assignee.id"),
            initiated: "admin"
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.admin.closed",
        eventName: "Admin closed conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (event) => {
          return {
            admin: _.get(event, "data.item.assignee.id")
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "conversation.admin.opened",
        eventName: "Admin opened conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (event) => {
          return {
            admin: _.get(event, "data.item.assignee.id")
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "conversation"
          };
        }
      },
      {
        intercom: "user.tag.created",
        eventName: "Added Tag",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (event) => {
          return {
            tag: _.get(event, "data.item.tag.name"),
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "tag"
          };
        }
      },
      {
        intercom: "user.tag.deleted",
        eventName: "Removed Tag",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (event) => {
          return {
            tag: _.get(event, "data.item.tag.name"),
          };
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.user.last_seen_ip", "0"),
            event_type: "tag"
          };
        }
      },
      {
        intercom: "user.unsubscribed",
        eventName: "Unsubscribed from emails",
        user: (event) => _.pick(_.get(event, "data.item"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {};
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.last_seen_ip", "0"),
            event_type: "email"
          };
        }
      },
      {
        intercom: "user.email.updated",
        eventName: "Updated email address",
        user: (event) => _.pick(_.get(event, "data.item"), ["email", "id", "user_id", "type", "anonymous"]),
        props: (_event) => {
          return {};
        },
        context: (event) => {
          return {
            ip: _.get(event, "data.item.last_seen_ip", "0"),
            event_type: "email"
          };
        }
      }
    ];
  }

  saveEvent(event) {
    const mappedEvent = _.find(this.map, { intercom: event.topic });

    if (!mappedEvent) {
      return null;
    }

    // FIXME: refactor these constraints
    if (_.includes(["user.tag.created", "user.tag.deleted"], event.topic)
      && _.includes(this.tagMapping.getTagIds(), event.data.item.tag.id)) {
      // skipping this event
      this.logger.debug("skipping tag event", {
        user: event.data.item.user.email,
        topic: event.topic,
        tag: event.data.item.tag.name
      });
      return Promise.resolve();
    }

    const user = mappedEvent.user(event);
    const eventName = mappedEvent.eventName;
    const props = _.defaults(mappedEvent.props(event), {
      topic: event.topic
    });
    const context = _.defaults(mappedEvent.context(event), {
      source: "intercom",
      event_id: [user.id, event.topic, event.created_at].join("-"),
      created_at: event.created_at,
    });
    let ident;

    // anonymous is set to true for intercom leads
    if (user.anonymous === true || user.type === "lead" || user.type === "contact") {
      ident = getLeadIdent({}, user);
      context.active = true;
    } else {
      ident = this.userMapping.getIdentFromIntercom(user);
    }
    console.log("--------", "client.asUser", ident, ".track", eventName);
    this.logger.info("incoming.event", { ident, eventName, props, context });
    this.metric.increment("ship.incoming.events", 1);
    return this.client.asUser(ident).track(eventName, props, context);
  }
}
