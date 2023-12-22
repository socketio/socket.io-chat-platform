import { expect } from "chai";
import { setup } from "./../util.js";

describe("channel:search", () => {
  let context, aliceSocket1, aliceSocket2;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
  });

  after(() => {
    context.cleanup();
  });

  it("should return a list of channels", async () => {
    await context.resetDatabase();

    await context.pgPool.query(
      "INSERT INTO channels(name, type) VALUES ($1, 'public'), ($2, 'public'), ($3, 'public') RETURNING id",
      ["foo", "bar", "baz"],
    );

    const result = await aliceSocket1.emitWithAck("channel:search", {
      q: "fo",
    });

    expect(result.status).to.eql("OK");
    expect(result.data.length).to.eql(1);
    expect(result.data[0].name).to.eql("foo");
  });

  it("should exclude already joined channels", async () => {
    await context.resetDatabase();

    const queryResult = await context.pgPool.query(
      "INSERT INTO channels(name, type) VALUES ($1, 'public'), ($2, 'public'), ($3, 'public') RETURNING id",
      ["foo", "bar", "baz"],
    );
    await context.pgPool.query(
      "INSERT INTO user_channels (user_id, channel_id) VALUES ($1, $2)",
      [context.aliceUserId, queryResult.rows[1].id],
    );

    const result = await aliceSocket1.emitWithAck("channel:search", {
      q: "ba",
    });

    expect(result.status).to.eql("OK");
    expect(result.data.length).to.eql(1);
    expect(result.data[0].name).to.eql("baz");
  });
});
