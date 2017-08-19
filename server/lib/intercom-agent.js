import _ from "lodash";
import Promise from "bluebird";
import moment from "moment";

/**
 * Superset of Intercom API
 */
export default class IntercomAgent {

  constructor(intercomClient, { client, metric, cache }) {
    this.intercomClient = intercomClient;
    this.client = client;
    this.logger = client.logger;
    this.metric = metric;
    this.cache = cache;
  }

  getJob(id) {
    return this.intercomClient.get(`/jobs/${id}`)
      .then(res => {
        const isCompleted = _.get(res, "body.tasks[0].state") === "completed"
          || _.get(res, "body.tasks[0].state") === "completed_with_errors";

        const hasErrors = _.get(res, "body.tasks[0].state") === "completed_with_errors";

        return {
          isCompleted,
          hasErrors
        };
      });
  }

  /**
   * @see https://developers.intercom.com/reference#bulk-job-feeds
   * @param  {String} id
   * @return {Array} items param of the job feed
   */
  getJobErrors(id) {
    return this.intercomClient.get(`/jobs/${id}/error`)
      .then(res => {
        return _.get(res, "body.items", []);
      });
  }

  importUsers(scroll_param = null, updated_after, updated_before) {
    return this.intercomClient.get("/users/scroll")
    .query({ scroll_param })
    .then(response => {
      let { users } = response.body;
      const { scroll_param: next_scroll_param } = response.body;

      if (updated_after && moment(updated_after).isValid()) {
        users = users.filter((u) => {
          return moment(u.updated_at, "X")
            .isAfter(updated_after);
        });
      }

      if (updated_before && moment(updated_before).isValid()) {
        users = users.filter((u) => {
          return moment(u.updated_at, "X")
            .isBefore(updated_before);
        });
      }

      return { users, scroll_param: next_scroll_param };
    })
    .catch(err => {
      const fErr = this.intercomClient.handleError(err);

      if (_.get(fErr, "body.errors[0].code") === "scroll_exists") {
        this.metric.event({ title: "Trying to perform two separate scrolls" });
        return Promise.resolve([]);
      }

      if (_.get(fErr, "body.errors[0].code") === "not_found") {
        this.metric.event({ title: "Scroll expired, should start it again" });
        return Promise.resolve([]);
      }

      // handle errors which may happen here
      return Promise.reject(fErr);
    });
  }

  sendUsers(users, mode = "bulk") {
    if (_.isEmpty(users)) {
      this.logger.debug("sendUsers.emptyList");
      return Promise.resolve();
    }

    this.logger.debug("sendUsers", users.length);

    const body = {
      items: users.map(u => {
        this.logger.debug("outgoing.user.payload", u);
        return {
          method: "post",
          data_type: "user",
          data: u
        };
      })
    };

    if (users.length < (process.env.MINIMUM_BULK_SIZE || 10)
      || mode === "regular") {
      return Promise.map(body.items, item => {
        return this.intercomClient.post("/users")
          .send(item.data)
          .then(response => {
            return response.body;
          })
          .catch(err => {
            const fErr = this.intercomClient.handleError(err);
            this.logger.error("intercomAgent.sendUsers.microbatch.error", fErr);
            return Promise.reject(fErr);
          });
      }, { concurrency: 5 });
    }

    return this.intercomClient
      .post("/bulk/users")
      .send(body)
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("intercomAgent.sendUsers.bulkSubmit.error", fErr);
        return Promise.reject(fErr);
      });
  }

  tagUsers(ops) {
    const opArray = [];
    _.map(ops, (op, segmentName) => {
      this.logger.debug("intercomAgent.tagUsers", { segmentName, usersCount: op.length });
      opArray.push({
        name: segmentName,
        users: op
      });
    });
    return Promise.map(opArray, (op) => {
      return this.intercomClient.post("/tags")
        .send(op)
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
          this.logger.error("intercomAgent.tagUsers.error", fErr);
          return Promise.reject(fErr);
        });
    }, { concurrency: 3 });
  }

  /**
   * get total count of users
   */
  getUsersTotalCount() {
    return this.intercomClient.get("/users")
      .query({ per_page: 1 })
      .then(response => {
        return _.get(response, "body.total_count");
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("getUsersTotalCount.error", fErr);
        return Promise.reject(fErr);
      });
  }

  getRecentUsers(last_updated_at, count, page) {
    return this.intercomClient.get("/users")
      .query({
        per_page: count,
        page,
        order: "desc",
        sort: "updated_at"
      })
      .then(response => {
        const originalUsers = _.get(response, "body.users", []);
        const users = originalUsers.filter((u) => {
          return moment(u.updated_at, "X")
            .isAfter(last_updated_at);
        });
        this.logger.debug("getRecentUsers.count", {
          total: originalUsers.length,
          filtered: users.length
        });

        return {
          users,
          hasMore: !_.isEmpty(_.get(response, "body.pages.next"))
            && users.length === originalUsers.length
        };
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("getRecentUsers.error", fErr);
        return Promise.reject(fErr);
      });
  }

  /**
   * @see https://developers.intercom.com/reference#event-model
   * @see https://developers.intercom.com/reference#bulk-event-ops
   * @see https://developers.intercom.com/reference#submitting-events
   * @param  {Array} array of events data
   * @return {Promise}
   */
  sendEvents(events) {
    this.metric.increment("ship.outgoing.events", events.length);
    // FIXME: enable bulk jobs and remove `true` here, when we can match the user by `id`,
    // look at error logged below
    if (true || events.length <= 10) { // eslint-disable-line no-constant-condition
      return Promise.map(events, (event) => {
        return this.intercomClient
        .post("/events")
        .send(event)
        .catch((err) => {
          return Promise.reject(this.intercomClient.handleError(err));
        });
      }, { concurrency: 3 });
    }

    const wrappedEvents = events.map(e => {
      return {
        method: "post",
        data_type: "event",
        data: e
      };
    });

    const batches = _.chunk(wrappedEvents, 100);

    return Promise.map(batches, (batch) => {
      return this.intercomClient
        .post("/bulk/events")
        .send({
          items: batch
        })
        .then(({ body }) => {
          return this.intercomClient
            .get(body.links.error)
            .then((res) => {
              // FIXME: place to verify if the error still persists
              console.error(res.body.items[0].error);
            });
        })
        .catch((err) => {
          return Promise.reject(this.intercomClient.handleError(err));
        });
    }, { concurrency: 3 });
  }

  getTags() {
    this.logger.debug("connector.getTags");
    return this.cache.wrap("intercomTags", () => {
      this.logger.debug("connector.getTags.cachemiss");
      // TODO check if /tags endpoint has pagination
      return this.intercomClient.get("/tags")
        .then(res => {
          // console.log("TEST", res.body);
          return _.get(res, "body.tags", []);
        });
    });
  }
}
