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

    const returnConnector = (req, res) => {
      res.json({
        id: "595103c73628d081190000f6",
        private_settings: {
          access_token: "intercomABC",
          webhook_id: "abc-123"
        }
      });
    };
    minihull.stubPut("/api/v1/595103c73628d081190000f6").callsFake(returnConnector);
    minihull.stubGet("/api/v1/app").callsFake(returnConnector);
    minihull.stubGet("/api/v1/595103c73628d081190000f6").callsFake(returnConnector);
    minihull.stubGet("/api/v1/segments")
      .callsFake((req, res) => {
        res.json([]);
      });
  });

  it("should retry after ten seconds in case of rate limit", (done) => {
    miniintercom.stubGet("/users")
      .callsFake((req, res) => {
        res.json({
          users: [{
            id: "intercomUserId",
            email: "foo@bar.com",
            updated_at: minihull.moment().format("X")
          }]
        });
      });
    const stub = miniintercom.stubGet("/subscriptions/abc-123")
      .onFirstCall().callsFake((req, res) => {
        res.status(429).end();
      })
      .onSecondCall().callsFake((req, res) => {
        res.status(200).end();
      });
    miniintercom.stubPost("/subscriptions/abc-123")
      .callsFake((req, res) => {
        res.json({});
      });

    miniintercom.on("incoming.request@/subscriptions/abc-123", (req) => {
      if(miniintercom.requests.get("incoming").filter({ url: "/subscriptions/abc-123" }).size().value()) {
        done();
      }
    });

    minihull.post("http://localhost:8000/sync?ship=595103c73628d081190000f6&organization=localhost:8001&secret=123")
      .then((res) => {})
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
