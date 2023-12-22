import { expect } from "chai";
import { setup } from "./../util.js";

describe("user:search", () => {
  let context, aliceSocket1, aliceSocket2, bobSocket;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
    bobSocket = context.bobSocket;
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    await context.resetDatabase();
    await context.pgPool.query(
      "INSERT INTO users (username, password) VALUES ('carol', ''), ('dan', ''), ('david', '')",
    );

    const result = await aliceSocket1.emitWithAck("user:search", {
      q: "da",
    });

    expect(result.status).to.eql("OK");
    expect(result.data.length).to.eql(2);
    expect(result.data[0].username).to.eql("dan");
    expect(result.data[1].username).to.eql("david");
  });
});
