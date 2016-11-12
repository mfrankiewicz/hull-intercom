import Promise from "bluebird";
import _ from "lodash";

export default class Jobs {

  sendUsers(req) {
    const users = req.payload;

    const usersToSave = req.shipApp.hullAgent.getUsersToSave(users);
    const usersToModify = req.shipApp.hullAgent.getUsersToModify(users);

    req.shipApp.intercomAgent.updateUser();
  }

  saveUsers(req) {
    const { users } = req.payload;
    console.log("UPDATE");
    return Promise.resolve();
    // req.shipApp.hullAgent.updateUser();
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
