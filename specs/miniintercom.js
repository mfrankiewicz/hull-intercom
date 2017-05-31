import Minibase from "minihull/src/minibase";

export default class Miniintercom extends Minibase {
  constructor(options = {}) {
    super(options);
    this.db.defaults({ contacts: [] }).write();
    this.app.post("/subscriptions", (req, res) => {
      res.end("ok");
    });
    this.app.post("/users", (req, res) => {
      res.end("ok");
    });
    this.app.post("/bulk/users", (req, res) => {
      res.json({});
    });
  }

  fakeUsers(count) {
    return this.db.get("contacts").push({
      id: "123",
      name: "test"
    }).write();
  }
}
