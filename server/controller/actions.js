export default class Actions {

  fetchAll(req, res) {
    req.shipApp.queueAgent.create("importUsers")
      .then(res => console.log(res), err => console.log(err));
    res.end("ok");
  }

  batchHandler(req, res) {
    req.shipApp.hullAgent.extractAgent.handleExtract(req.body, 100, (users) => {
      req.shipApp.queueAgent.create("sendUsers", { users });
    });
    res.end("ok");
  }

  userSchema(req, res) {
    res.json({
      options: [{
        label: "This is label",
        value: "This is value"
      }]
    });
  }

  webhook(req, res) {
    console.log(req.body);
    res.end("ok")
  }
}
