const Minihull = require("minihull");
const expect = require("chai").expect;

const Miniintercom = require("./miniintercom");
const bootstrap = require("./bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("outgoing users traffic", function test() {
  let minihull, miniintercom, server;
  beforeEach((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    server = bootstrap();
    minihull.listen(8001);
    minihull.stubSegments([{ id: "s2", name: "Segment 2" }]);
    minihull.stubConnector({
      id: "595103c73628d081190000f6",
      private_settings: {
        access_token: "intercomABC",
        synchronized_segments: ["s1"]
      }
    });

    miniintercom.listen(8002).then(done);
  });

  it("should remove tags from users", (done) => {
    const getTagsStub = miniintercom.stubApp("GET", "/tags")
      .respond({ tags: [] });
    miniintercom.stubApp("POST", "/users")
      .callsFake((req, res) => {
        res.json({ email: "foo@bar.com", tags: { tags: [{ name: "Segment 2" }] } });
      });
    const tagsStub = miniintercom.stubApp("POST", "/tags")
      .callsFake((req, res) => {
        res.end("ok");
      });

    minihull.notifyConnector("595103c73628d081190000f6", "http://localhost:8000/notify", "user_report:update", {
      user: { id: "123", email: "foo@bar.com" },
      segments: [{ id: "s1", name: "Segment 1" }],
      changes: {
        segments: {
          left: [{ id: "s2", name: "Segment 2" }]
        }
      },
      events: []
    });

    miniintercom.on("incoming.request@/tags", (req) => {
      if (req.body.users) {
        expect(req.body.users[0]).to.eql({ email: "foo@bar.com", untag: true });
        expect(req.body.name).to.equal("Segment 2");
        done();
      }
    });
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
