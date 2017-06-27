const Minihull = require("minihull");
const expect = require("chai").expect;

const Miniintercom = require("./miniintercom");
const bootstrap = require("./bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";
process.env.RATE_LIMIT_DELAY = 200;

describe("ensure webhook operation", function test() {
  let minihull, miniintercom, server;
  beforeEach(() => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    minihull.listen(8001);
    miniintercom.listen(8002);
    server = bootstrap();
    minihull.stubConnector({
      id: "595103c73628d081190000f6",
      private_settings: {
        access_token: "intercomABC",
        webhook_id: "abc-123"
      }
    });
  });

  it("should retry after ten seconds in case of rate limit", (done) => {
    miniintercom.stubGet("/users")
      .returnsJson({
        users: [{
          id: "intercomUserId",
          email: "foo@bar.com",
          updated_at: minihull.moment().format("X")
        }]
      });
    const stub = miniintercom.stubGet("/subscriptions/abc-123")
      .onFirstCall().returnsStatus(429)
      .onSecondCall().returnsStatus(200);
    miniintercom.stubPost("/subscriptions/abc-123")
      .returnsJson({});

    miniintercom.on("incoming.request@/subscriptions/abc-123", (req) => {
      if(miniintercom.requests.get("incoming").filter({ url: "/subscriptions/abc-123" }).size().value()) {
        done();
      }
    });

    minihull.postConnector("595103c73628d081190000f6", "http://localhost:8000/sync")
      .then((res) => {})
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
