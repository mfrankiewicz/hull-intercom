import Promise from "bluebird";
import _ from "lodash";

export default class Jobs {

  /**
   * Takes list of users with fields and segment_ids set,
   * sends them to Intercom and tags them.
   */
  static sendUsers(ctx, payload) {
    const { users, mode = "bulk" } = payload;
    const { syncAgent, intercomAgent } = ctx.shipApp;

    ctx.client.logger.debug("sendUsers.preFilter", users.length);
    const usersToSave = syncAgent.getUsersToSave(users);
    const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u));

    ctx.client.logger.debug("sendUsers.filtered", intercomUsersToSave.length);
    ctx.metric.increment("ship.outgoing.users", intercomUsersToSave.length);

    return syncAgent.syncShip()
      .then(() => intercomAgent.sendUsers(intercomUsersToSave, mode))
      .then(res => {
        if (_.isArray(res)) {
          const savedUsers = _.intersectionBy(usersToSave, res, "email")
            .map(u => {
              const intercomData = _.find(res, { email: u.email });
              u["traits_intercom/id"] = intercomData.id;
              u["traits_intercom/tags"] = intercomData.tags.tags.map(t => t.name);

              ctx.client.logger.info("outgoing.user.success", _.pick(u, ["email", "id", "external_id"]));
              return u;
            });
          const errors = _.filter(res, { body: { type: "error.list" } });

          const groupedErrors = errors.map(errorReq => {
            return {
              data: errorReq.req.data,
              error: errorReq.body.errors
            };
          });

          return syncAgent.sendEvents(savedUsers)
            .then(() => syncAgent.groupUsersToTag(savedUsers))
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
            .then(() => syncAgent.handleUserErrors(groupedErrors));
        }

        if (_.get(res, "body.id")) {
          return ctx.enqueue("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      });
  }

  static handleBulkJob(ctx, payload) {
    const { id, users, attempt = 1 } = payload;
    const { syncAgent, intercomAgent } = ctx.shipApp;
    return intercomAgent.getJob(id)
      .then(({ isCompleted, hasErrors }) => {
        if (isCompleted) {
          ctx.metric.increment("intercom.bulk_job.attempt", attempt);
          return (() => {
            if (hasErrors) {
              return intercomAgent.getJobErrors(id)
                .then(data => syncAgent.handleUserErrors(data));
            }
            return Promise.resolve();
          })()
            .then(() => {
              users.map(u => {
                return ctx.client.logger.info("outgoing.user.success", _.pick(u, ["email", "id"]));
              });
            })
            .then(() => syncAgent.groupUsersToTag(users))
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers));
        }

        if (attempt > 20) {
          ctx.metric.increment("intercom.bulk_job.fallback", 1);
          return ctx.enqueue("sendUsers", { users, mode: "regular" });
        }

        return ctx.enqueue("handleBulkJob", {
          users,
          id,
          attempt: attempt + 1
        }, { delay: attempt * 10000 });
      });
  }


  /**
   * Saves users incoming from Intercom API
   * @return {Promise}
   * @param ctx
   * @param payload
   */
  static saveUsers(ctx, payload) {
    const { users } = payload;
    const { syncAgent } = ctx.shipApp;

    ctx.metric.increment("ship.incoming.users", users.length);

    return syncAgent.syncShip()
      .then(() => {
        return Promise.map(users, (intercomUser) => {
          ctx.client.logger.info("incoming.user", intercomUser);
          const ident = syncAgent.userMapping.getIdentFromIntercom(intercomUser);
          const traits = syncAgent.userMapping.getHullTraits(intercomUser);
          if (ident.email) {
            return ctx.client.asUser(ident).traits(traits);
          }
          return ctx.client.logger.info("incoming.user.skip", intercomUser);
        });
      })
      .then(() => {
        const customAttributes = _.uniq(_.flatten(users.map(u => _.keys(u.custom_attributes))));
        const oldAttributes = ctx.ship.private_settings.custom_attributes;
        const newAttributes = _.difference(customAttributes, oldAttributes);
        if (!_.isEmpty(newAttributes)) {
          return ctx.helpers.updateSettings({
            custom_attributes: _.concat(oldAttributes, newAttributes)
          });
        }
        return true;
      });
  }

  static fetchAllUsers(ctx, payload = {}) {
    const { scroll_param } = payload;
    const { intercomAgent } = ctx.shipApp;
    if (_.isEmpty(scroll_param)) {
      ctx.metric.event({
        title: "fetchAllUsers"
      });
    }
    return intercomAgent.importUsers(scroll_param)
      .then(({ users, scroll_param: next_scroll_param }) => {
        if (_.isEmpty(users)) {
          return Promise.resolve();
        }
        // scroll feature of Intercom API have expiration time which is
        // hard to recover from. The is the reason why continuing the import
        // scroll queries is more important than other tasks here.
        // It will put much more data into the queue, but when user scroll param
        // expires it cannot be recovered.
        // @see https://developers.intercom.com/reference#iterating-over-all-users
        return Promise.all([
          ctx.enqueue("fetchAllUsers", { scroll_param: next_scroll_param }, { priority: "high" }),
          ctx.enqueue("saveUsers", { users })
        ]);
      });
  }

  static batchHandler(ctx, source, segmentId) {
    return (users) => {
      const ignoreFilter = (source !== "connector");
      users = _.filter(users.map(u => {
        return ctx.shipApp.syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] }, ignoreFilter);
      }));

      users.map(u => ctx.client.logger.debug("outgoing.user.start", _.pick(u, ["email", "id"])));

      return ctx.enqueue("sendUsers", { users });
    };
  }


  static handleBatch(ctx, payload) {
    const segmentId = ctx.query.segmentId;
    const { body, source } = payload;
    ctx.metric.event("batch", {
      properties: {
        context: ctx.client.configuration(),
        text: JSON.stringify(payload.body)
      }
    });

    return ctx.client.utils.extract.handle({ body, batchSize: 100, handler: this.batchHandler(ctx, source, segmentId) });
  }

  static fetchUsers(ctx, payload = {}) {
    const { syncAgent, intercomAgent } = ctx.shipApp;
    const { last_updated_at, count, page = 1 } = payload;

    return (() => {
      if (_.isEmpty(last_updated_at)) {
        return syncAgent.getLastUpdatedAt();
      }
      return Promise.resolve(last_updated_at);
    })()
      .then((new_last_updated_at) => {
        ctx.client.logger.debug("fetchUsers", { new_last_updated_at, page });
        return intercomAgent.getRecentUsers(new_last_updated_at, count, page)
          .then(({ users, hasMore }) => {
            const promises = [];
            if (hasMore) {
              promises.push(ctx.enqueue("fetchUsers", {
                last_updated_at: new_last_updated_at,
                count,
                page: page + 1
              }));
            }

            if (!_.isEmpty(users)) {
              promises.push(ctx.enqueue("saveUsers", { users }));
            }

            return Promise.all(promises);
          });
      });
  }

  static saveEvents(ctx, payload) {
    const { syncAgent, intercomAgent } = ctx.shipApp;
    const { events = [] } = payload;
    return Promise.all(events.map(e => syncAgent.eventsAgent.saveEvent(e)))
      .then(() => intercomAgent.getTags())
      .then((allTags) => {
        return Promise.all(events.map(e => {
          if ((e.topic === "user.tag.created" || e.topic === "user.tag.deleted")
            && _.get(e, "data.item.user")) {
            const user = _.get(e, "data.item.user");
            const ident = syncAgent.userMapping.getIdentFromIntercom(user);
            const tags = user.tags.tags.map(t => {
              if (!t.name) {
                t = _.find(allTags, { id: t.id });
              }
              return t.name;
            });
            if (ident.email) {
              const traits = {};
              traits["intercom/tags"] = tags;
              return ctx.client.asUser(ident).traits(traits);
            }
          }
          return null;
        }));
      });
  }
}
