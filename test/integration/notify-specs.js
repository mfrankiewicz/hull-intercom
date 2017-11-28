const Minihull = require("minihull");
const expect = require("chai").expect;

const Miniintercom = require("./support/miniintercom");
const bootstrap = require("./support/bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("outgoing users traffic", function test() {
  let minihull, miniintercom, server;
  before((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    server = bootstrap();
    setTimeout(() => {
      minihull.listen(8001);
      minihull.segments().push({ id: "s2", name: "Segment 2" }).write();
      minihull.install("http://localhost:8000")
        .then(() => {
          minihull.updateFirstShip({
            access_token: "intercomABC",
            synchronized_segments: ["s1"]
          });
          done();
        });
    }, 100);

    miniintercom.listen(8002);
  });

  it("should remove tags from users", (done) => {
    miniintercom.stubPost("/users")
      .callsFake((req, res) => {
        res.json({ email: "foo@bar.com", tags: { tags: [{ name: "Segment 2" }] } });
      });
    const tagsStub = miniintercom.stubPost("/tags")
      .callsFake((req, res) => {
        res.end("ok");
      });

    minihull.sendNotification("user_report:update", {
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

  after(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
