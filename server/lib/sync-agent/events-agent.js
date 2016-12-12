import _ from "lodash";

export default class TagMapping {

  constructor(hullAgent, ship) {
    this.ship = ship;
    this.hullClient = hullAgent.hullClient;

    this.map = [
      {
        intercom: "user.tag.created",
        hull: {
          eventName: "Added Tag",
          email: (event) => event.data.item.user.email,
          props: (event) => {
            return {
              tag: event.data.item.tag.name,
              topic: event.topic
            };
          },
          event_type: "tag",
        }
      },
      {
        intercom: "user.tag.deleted",
        hull: {
          eventName: "Removed Tag",
          email: (event) => event.data.item.user.email,
          props: (event) => {
            return {
              tag: event.data.item.tag.name,
              topic: event.topic
            };
          },
          event_type: "tag",
        }
      },
      {
        intercom: "user.unsubscribed",
        hull: {
          eventName: "Unsubscribed from emails",
          email: (event) => event.data.item.email,
          props: (event) => {
            return {
              topic: event.topic
            };
          },
          event_type: "email",
        }
      }
    ];
  }

  trackEvent(event) {
    const mappedEvent = _.find(this.map, { intercom: event.topic });

    if (!mappedEvent) {
      return null;
    }

    const props = mappedEvent.hull.props(event);
    console.log("trackEvent", mappedEvent.hull.email(event), props);
    return this.hullClient.as({
      email: mappedEvent.hull.email(event)
    }).track(mappedEvent.hull.eventName, props, {
      source: "intercom",
      event_id: event.id,
      created_at: event.created_at
    });
  }
}
