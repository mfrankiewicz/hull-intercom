import Promise from "bluebird";
import _ from "lodash";

export default class Jobs {

  sendUsers(req) {
    const { users } = req.payload;

    const usersToSave = req.shipApp.syncAgent.getUsersToSave(users);
    const usersToTag = req.shipApp.syncAgent.getUsersToTag(users);

    const intercomUsers = usersToSave.map(u => req.shipApp.syncAgent.userMapping.getIntercomFields(u));
    return req.shipApp.intercomAgent.saveUsers(intercomUsers)
      .then(res => {
        if (_.get(res, "body.id")) {
          return req.shipApp.queueAgent.create("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      })
  }

  handleBulkJob(req) {
    const { id, users } = req.payload;
    return req.shipApp.intercomClient.get(`/jobs/${id}`)
      .then(res => {
        console.log(res.body.tasks[0].state);
        if (_.get(res, "body.tasks[0].state") === "completed") {
          return req.shipApp.hullAgent.getSegments()
            .then(segments => {
              const ops = _.reduce(users, (o, user) => {

                user.segment_ids.map(segment_id => {
                  const segment = _.find(segments, { id: segment_id });
                  o[segment.name] = o[segment.name] || [];
                  o[segment.name].push({
                    email: user.email
                  });
                });
                return o;
              }, {});
              return ops;
            })
            .then(ops => {
              const opArray = [];
              _.map(ops, (op, segmentName) => {
                opArray.push({
                  name: segmentName,
                  users: op
                });
              });
              return Promise.map(opArray, (op) => {
                return req.shipApp.intercomClient.post("/tags")
                  .send(op);
              }, { concurrency: 3 });
            });

        }
      });
  }

  saveUsers(req) {
    const { users } = req.payload;
    const { syncAgent } = req.shipApp;

    const mappedUsers = users.map((u) => syncAgent.userMapping.getHullTraits(u));

    return Promise.map(mappedUsers, (user) => {
      return req.hull.client.as({ email: user.email }).traits(user);
    }, { concurrency: 3 });
  }

  importUsers(req) {
    const { scroll_param } = req.payload;
    return req.shipApp.intercomClient.get("/users/scroll")
    .query({ scroll_param })
    .then(response => {
      const { users } = response.body;

      if (_.isEmpty(users)) {
        return Promise.resolve();
      }
      req.shipApp.queueAgent.create("importUsers", { scroll_param: response.body.scroll_param })
      return req.shipApp.queueAgent.create("saveUsers", { users });
    })
    .catch(err => {
      const fErr = req.shipApp.intercomClient.handleError(err);

      if (_.get(fErr, "extra.body.errors[0].code") === "scroll_exists") {
        console.error("Trying to perform two separate scrolls");
        return Promise.resolve();
      }

      // handle errors which may happen here
      return Promise.reject(fErr);
    });
  }

}
