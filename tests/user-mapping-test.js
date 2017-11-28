import _ from "lodash";
import { expect } from "chai";

import mapping from "../server/lib/sync-agent/user-mapping";

const logger = {
  warning(key, msg) { console.log(key, msg); }
};
const client = { logger };
const ship = {
  private_settings: {
    sync_fields_to_intercom: [
      {
        hull: "tech",
        name: "technologies"
      }, {
        hull: "traits_intercom/id",
        name: "id"
      }, {
        hull: "email",
        name: "email"
      }
    ]
  }
};
const ctx = { client, ship };
const m = new mapping(ctx);

describe("computeIntercomFields", () => {
  it("should map values", () => {
    const fields = m.computeIntercomFields();

    expect(fields).to.have.lengthOf(3);
    expect(fields[0]).to.deep.equal({ hull: "tech", name: "custom_attributes.technologies", overwrite: false });
    expect(fields[1]).to.deep.equal({ hull: "traits_intercom/id", name: "custom_attributes.id", overwrite: false });
    expect(fields[2]).to.deep.equal({ hull: "email", name: "email", overwrite: false });
  });
});

describe("getIntercomFields", () => {
  it("should trim constrained values", () => {
    // empty user
    let fields = m.getIntercomFields({}, ctx);
    expect(fields).to.deep.equal({});

    // user with matching traits as string
    let user = { tech: "13246" };
    fields = m.getIntercomFields(user, ctx);

    // user with matching traits - too long
    user = { tech: _.range(1000).join(",") };
    fields = m.getIntercomFields(user, ctx);
    expect(fields).to.deep.equal({ custom_attributes: { technologies: `${_.range(86).join(",")},8 [...]` } });

    // user with array -- too long
    user = { tech: _.fill(Array(500), "0") };
    fields = m.getIntercomFields(user, ctx);
    expect(fields).to.deep.equal({ custom_attributes: { technologies: `${_.fill(Array(125), "0").join(",")} [...]` } });

    // user with array -- ok
    user = { tech: _.fill(Array(50), "0") };
    fields = m.getIntercomFields(user, ctx);
    expect(fields).to.deep.equal({ custom_attributes: { technologies: _.fill(Array(50), "0").join(",") } });
  });
});
