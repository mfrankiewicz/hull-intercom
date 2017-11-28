const Minihull = require("minihull");
const expect = require("chai").expect;

const Miniintercom = require("./support/miniintercom");
const bootstrap = require("./support/bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";
process.env.OVERRIDE_RATE_LIMIT_DELAY = 200;

describe("batch operation", function test() {
  let minihull, miniintercom, server;
  beforeEach((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    minihull.listen(8001);
    miniintercom.listen(8002);
    server = bootstrap();
    setTimeout(() => {
      minihull.install("http://localhost:8000")
        .then(() => {
          minihull.updateFirstShip({
            access_token: "intercomABC"
          });
          done();
        });
    }, 500);
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

  it("should retry after ten seconds in case of rate limit", (done) => {
    minihull.fakeUsers(1);
    const stub = miniintercom.stubPost("/users")
      .onFirstCall().callsFake((req, res) => {
        res.status(429).end();
      })
      .onSecondCall().callsFake((req, res) => {
        res.status(200).end();
      });
    miniintercom.on("incoming.request@/users", (req) => {
        if (stub.callCount === 1) {
          done();
        }
      });

    minihull.sendBatchToFirstShip()
    .then((res) => {});
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
