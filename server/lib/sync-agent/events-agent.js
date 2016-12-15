import _ from "lodash";

export default class TagMapping {

  constructor(hullAgent, ship) {
    this.ship = ship;
    this.hullClient = hullAgent.hullClient;

    this.map = [
      {
        intercom: "user.tag.created",
        eventName: "Added Tag",
        email: (event) => event.data.item.user.email,
        props: (event) => {
          return {
            tag: event.data.item.tag.name,
          };
        },
        context: (event) => {
          return {
            event_type: "tag",
          };
        }
      },
      {
        intercom: "user.tag.deleted",
        eventName: "Removed Tag",
        email: (event) => event.data.item.user.email,
        props: (event) => {
          return {
            tag: event.data.item.tag.name,
          };
        },
        context: (event) => {
          return {
            event_type: "tag",
          };
        }
      },
      {
        intercom: "user.unsubscribed",
        eventName: "Unsubscribed from emails",
        email: (event) => event.data.item.email,
        props: (event) => {
          return {};
        },
        context: (event) => {
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

    const email = mappedEvent.email(event);
    const eventName = mappedEvent.eventName;
    const props = _.defaults(mappedEvent.props(event), {
      topic: event.topic
    });
    const context = _.defaults(mappedEvent.context(event), {
      source: "intercom",
      event_id: event.id,
      created_at: event.created_at
    });

    console.log("track", email, eventName, props, context)
    return this.hullClient.as({ email }).track(eventName, props, context);
  }
}
