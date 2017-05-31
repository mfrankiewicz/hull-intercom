import Minihull from "minihull";
import { expect } from "chai";

import Miniintercom from "./miniintercom";
import bootstrap from "./bootstrap";

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("batch operation", function test() {
  let minihull, miniintercom, server;
  before((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    server = bootstrap();
    setTimeout(() => {
      minihull.listen(8001);
      minihull.install("http://localhost:8000")
        .then(() => {
          minihull.updateFirstShip({
            access_token: "intercomABC"
          });
          done();
        });
    }, 100);

    miniintercom.listen(8002);
  });

  it("should pass batch extract to intercom batch endpoint via single api calls", (done) => {
    minihull.fakeUsers(2);
    minihull.sendBatchToFirstShip()
    .then((res) => {
      const lastReq = miniintercom.requests.get("incoming").last().value();
      expect(lastReq.url).to.be.eq("/users");
      expect(lastReq.body).to.be.an("object");
      expect(lastReq.body).to.have.property("email");
      done();
    });
  });

  it("should pass batch extract to intercom batch endpoint via bulk api", (done) => {
    minihull.fakeUsers(20);
    minihull.sendBatchToFirstShip()
    .then((res) => {
      const lastReq = miniintercom.requests.get("incoming").last().value();
      expect(lastReq.url).to.be.eq("/bulk/users");
      expect(lastReq.body).to.be.an("object");
      expect(lastReq.body).to.have.property("items");
      expect(lastReq.body.items).to.be.an("array");
      expect(lastReq.body.items[0].data).to.be.an("object");
      expect(lastReq.body.items[0].data).to.have.property("email");
      done();
    });
  });

  after(() => {
    minihull.resetDbState();
    minihull.close();
    miniintercom.resetDbState();
    miniintercom.close();
    server.close();
  });
});
