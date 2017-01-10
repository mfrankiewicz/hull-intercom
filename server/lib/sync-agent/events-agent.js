import _ from "lodash";
import Promise from "bluebird";

export default class TagMapping {

  constructor(hullAgent, tagMapping, ship) {
    this.ship = ship;
    this.hullClient = hullAgent.hullClient;
    this.tagMapping = tagMapping;

    this.map = [
      {
        intercom: "conversation.user.created",
        eventName: "User started conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (_event) => {
          return {
            initiated: "user"
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.user.replied",
        eventName: "User replied to conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (_event) => {
          return {
            initiated: "user"
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.admin.replied",
        eventName: "Admin replied to conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (_event) => {
          return {
            initiated: "admin"
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.admin.single.created",
        eventName: "Admin started conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (_event) => {
          return {
            initiated: "admin"
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.admin.assigned",
        eventName: "Admin assigned conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (event) => {
          return {
            to: _.get(event, "data.item.user.id"),
            admin: _.get(event, "data.item.assignee.id"),
            initiated: "admin"
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.admin.closed",
        eventName: "Admin closed conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (event) => {
          return {
            admin: _.get(event, "data.item.assignee.id")
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "conversation.admin.opened",
        eventName: "Admin opened conversation",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (event) => {
          return {
            admin: _.get(event, "data.item.assignee.id")
          };
        },
        context: (_event) => {
          return {
            event_type: "conversation",
          };
        }
      },
      {
        intercom: "user.tag.created",
        eventName: "Added Tag",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (event) => {
          return {
            tag: _.get(event, "data.item.tag.name"),
          };
        },
        context: (_event) => {
          return {
            event_type: "tag",
          };
        }
      },
      {
        intercom: "user.tag.deleted",
        eventName: "Removed Tag",
        user: (event) => _.pick(_.get(event, "data.item.user"), ["email", "id"]),
        props: (event) => {
          return {
            tag: _.get(event, "data.item.tag.name"),
          };
        },
        context: (_event) => {
          return {
            event_type: "tag",
          };
        }
      },
      {
        intercom: "user.unsubscribed",
        eventName: "Unsubscribed from emails",
        user: (event) => _.pick(_.get(event, "data.item"), ["email", "id"]),
        props: (_event) => {
          return {};
        },
        context: (_event) => {
          return {
            event_type: "email",
          };
        }
      },
      {
        intercom: "user.email.updated",
        eventName: "Updated email address",
        user: (event) => _.pick(_.get(event, "data.item"), ["email", "id"]),
        props: (_event) => {
          return {};
        },
        context: (_event) => {
          return {
            event_type: "email",
          };
        }
      }
    ];
  }

  trackEvent(event) {
    const mappedEvent = _.find(this.map, { intercom: event.topic });

    if (!mappedEvent) {
      return null;
    }

    // FIXME: refactor these constraints
    if (_.includes(["user.tag.created", "user.tag.deleted"], event.topic)
      && _.includes(this.tagMapping.getTagIds(), event.data.item.tag.id)) {
      // skipping this event
      this.hullClient.logger.debug("skipping tag event", {
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
      created_at: event.created_at
    });

    this.hullClient.logger.info("track", user, eventName, props, context);
    return this.hullClient.as({ email: user.email }).track(eventName, props, context);
  }
}
