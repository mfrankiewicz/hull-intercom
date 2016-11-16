import _ from "lodash";
import Promise from "bluebird";
import moment from "moment";

/**
 * Superset of Intercom API
 */
export default class IntercomAgent {

    constructor(intercomClient, queueAgent) {
      this.intercomClient = intercomClient;
      this.queueAgent = queueAgent;
    }

    getJob(id) {
      return this.intercomClient.get(`/jobs/${id}`)
        .then(res => {
          return _.get(res, "body.tasks[0].state") === "completed"
            || _.get(res, "body.tasks[0].state") === "completed_with_errors";
        });
    }

    importUsers(scroll_param = null) {
      return this.intercomClient.get("/users/scroll")
      .query({ scroll_param })
      .then(response => {
        const { users, scroll_param } = response.body;

        return { users, scroll_param };
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);

        if (_.get(fErr, "extra.body.errors[0].code") === "scroll_exists") {
          console.error("Trying to perform two separate scrolls");
          return Promise.resolve([]);
        }

        if (_.get(fErr, "extra.body.errors[0].code") === "not_found") {
          console.error("Scroll expired, should start it again");
          return Promise.resolve([]);
        }

        // handle errors which may happen here
        return Promise.reject(fErr);
      });
    }

    saveUsers(users) {
      if (_.isEmpty(users)) {
        return Promise.resolve();
      }

      console.log("SAVING", users.length);

      const body = {
        "items": users.map(u => {
          return {
            method: "post",
            data_type: "user",
            data: u
          };
        })
      };

      if (users.length < (process.env.MINMUM_BULK_SIZE || 150)) {
        return Promise.map(body.items, item => {
          // item.data.asdfasdf = "zxcvzxcv";
          return this.intercomClient.post("/users")
            .send(item.data)
            .then(response => {
              return response.body;
            })
            .catch(err => {
              const fErr = this.intercomClient.handleError(err);
              console.log("intercomAgent.saveUsers.microbatch.error", fErr);
              return Promise.resolve(fErr);
            })
        }, { concurrency: 3 });
      }

      return this.intercomClient
        .post("/bulk/users")
        .send(body)
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
          console.log("intercomAgent.saveUsers.bulkSubmit.error", fErr);
          return Promise.reject(fErr);
        });
    }

    tagUsers(ops) {
      const opArray = [];
      _.map(ops, (op, segmentName) => {
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
            console.log("intercomAgent.tagUsers.error", fErr);
            return Promise.reject(fErr);
          });
      }, { concurrency: 3 });
    }

    /**
     * get total count of users
     */
    getUsersTotalCount() {
      return this.intercomClient.get("/users")
        .query({ per_page: 1})
        .then(response => {
          return _.get(response, "body.total_count");
        })
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
          console.log("FERROR", fErr);
          return Promise.reject(fErr);
        });
    }

    getRecentUsers(last_sync_at, count, page) {
      return this.intercomClient.get("/users")
        .query({
          per_page: count,
          page,
          order: "desc",
          sort: "updated_at"
        })
        .then(response => {

          const users = _.get(response, "body.users", []).filter((u) => {
            return moment(u.updated_at, "x")
              .isAfter(last_sync_at);
          });

          return {
            users,
            hasMore: !_.isEmpty(_.get(response, "body.pages.next"))
          };
        })
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
          console.log("FERROR", fErr);
          return Promise.reject(fErr);
        });
    }

}
