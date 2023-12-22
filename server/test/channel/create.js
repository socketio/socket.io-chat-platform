import { expect } from "chai";
import { setup, waitFor } from "./../util.js";

describe("channel:create", () => {
  let context, aliceSocket1, aliceSocket2;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    const [result, channel] = await Promise.all([
      aliceSocket1.emitWithAck("channel:create", {
        name: "foo",
      }),
      waitFor(aliceSocket2, "channel:created"),
    ]);

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.be.a("string");

    expect(channel.id).to.eql(result.data.id);
    expect(channel.name).to.eql("foo");
    expect(channel.type).to.eql("public");
  });

  it("should fail with a duplicate name", async () => {
    const result = await aliceSocket1.emitWithAck("channel:create", {
      name: "General",
    });

    expect(result.status).to.eql("ERROR");
  });

  it("should fail with an invalid name", async () => {
    const result = await aliceSocket1.emitWithAck("channel:create", {
      name: "",
    });

    expect(result.status).to.eql("ERROR");
  });
});
