// @flow
import _ from "lodash";

const mapping = [
  {
    intercom: "conversation.user.created",
    eventName: "User started conversation",
    user: (event) => _.get(event, "data.item.user"),
    props: (event) => {
      return {
        message: _.get(event, "data.item.conversation_message.body"),
        link: _.get(event, "data.item.links.conversation_web"),
        assignee_name: _.get(event, "data.item.assignee.name"),
        assignee_email: _.get(event, "data.item.assignee.email"),
        assignee_id: _.get(event, "data.item.assignee.id"),
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
    user: (event) => _.get(event, "data.item.user"),
    props: (event) => {
      return {
        message: _.get(event, "data.item.conversation_message.body"),
        link: _.get(event, "data.item.links.conversation_web"),
        assignee_name: _.get(event, "data.item.assignee.name"),
        assignee_email: _.get(event, "data.item.assignee.email"),
        assignee_id: _.get(event, "data.item.assignee.id"),
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
    user: (event) => _.get(event, "data.item.user"),
    props: (event) => {
      return {
        message: _.get(event, "data.item.conversation_message.body"),
        link: _.get(event, "data.item.links.conversation_web"),
        assignee_name: _.get(event, "data.item.assignee.name"),
        assignee_email: _.get(event, "data.item.assignee.email"),
        assignee_id: _.get(event, "data.item.assignee.id"),
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
    user: (event) => _.get(event, "data.item.user"),
    props: (event) => {
      return {
        message: _.get(event, "data.item.conversation_message.body"),
        link: _.get(event, "data.item.links.conversation_web"),
        assignee_name: _.get(event, "data.item.assignee.name"),
        assignee_email: _.get(event, "data.item.assignee.email"),
        assignee_id: _.get(event, "data.item.assignee.id"),
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
    user: (event) => _.get(event, "data.item.user"),
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
    user: (event) => _.get(event, "data.item.user"),
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
    user: (event) => _.get(event, "data.item.user"),
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
    user: (event) => _.get(event, "data.item.user"),
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
    user: (event) => _.get(event, "data.item.user"),
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
    user: (event) => _.get(event, "data.item"),
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
    user: (event) => _.get(event, "data.item"),
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

export default function getEventPayload(ctx: Object, intercomEvent: Object): Object {
  const mappedEvent = _.find(mapping, { intercom: intercomEvent.topic });
  if (!mappedEvent) {
    return {};
  }

  const user = mappedEvent.user(intercomEvent);
  const eventName = mappedEvent.eventName;
  const props = _.defaults(mappedEvent.props(intercomEvent), {
    topic: intercomEvent.topic
  });
  const context = _.defaults(mappedEvent.context(intercomEvent), {
    source: "intercom",
    event_id: [user.id, intercomEvent.topic, intercomEvent.created_at].join("-"),
    created_at: intercomEvent.created_at,
  });

  return { user, eventName, props, context };
}
