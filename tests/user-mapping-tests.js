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

describe("joinWithLimit function", () => {
  it("should trim arrays with single separator", () => {
    const value = "0123456789";
    const arrayWithLongValues = _.fill(Array(3), value);
    const separator = ",";

    expect(m.joinWithLimit(arrayWithLongValues, separator, 5)).to.equal("");
    expect(m.joinWithLimit(arrayWithLongValues, separator, 9)).to.equal("");

    expect(m.joinWithLimit(arrayWithLongValues, separator, 10)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 11)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 20)).to.equal(value);

    expect(m.joinWithLimit(arrayWithLongValues, separator, 20)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 21)).to.equal([value, value].join(separator));
  });

  it("should trim arrays with mulitple characters separator", () => {
    const value = "0123456789";
    const arrayWithLongValues = _.fill(Array(3), value);
    const separator = "@@";

    expect(m.joinWithLimit(arrayWithLongValues, separator, 5)).to.equal("");
    expect(m.joinWithLimit(arrayWithLongValues, separator, 9)).to.equal("");

    expect(m.joinWithLimit(arrayWithLongValues, separator, 10)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 11)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 20)).to.equal(value);

    expect(m.joinWithLimit(arrayWithLongValues, separator, 20)).to.equal(value);
    expect(m.joinWithLimit(arrayWithLongValues, separator, 22)).to.equal([value, value].join(separator));
  });
});

describe("computeIntercomFields", () => {
  it("should map values", () => {
    const fields = m.computeIntercomFields();

    expect(fields).to.have.lengthOf(3);
    expect(fields[0]).to.deep.equal({ hull: "tech", name: "custom_attributes.technologies" });
    expect(fields[1]).to.deep.equal({ hull: "traits_intercom/id", name: "custom_attributes.id" });
    expect(fields[2]).to.deep.equal({ hull: "email", name: "email" });
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
    expect(fields).to.deep.equal({ custom_attributes: { technologies: "" } });

    // user with array -- too long
    user = { tech: _.fill(Array(500), "0") };
    fields = m.getIntercomFields(user, ctx);
    expect(fields).to.deep.equal({ custom_attributes: { technologies: _.fill(Array(128), "0").join(",") } });

    // user with array -- ok
    user = { tech: _.fill(Array(50), "0") };
    fields = m.getIntercomFields(user, ctx);
    expect(fields).to.deep.equal({ custom_attributes: { technologies: _.fill(Array(50), "0").join(",") } });
  });
});
