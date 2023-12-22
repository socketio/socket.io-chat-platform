import { expect } from "chai";
import { setup, waitFor } from "./../util.js";

describe("channel:join", () => {
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
    await context.resetDatabase();
    const queryResult = await context.pgPool.query(
      "INSERT INTO channels(name, type) VALUES ($1, $2) RETURNING id",
      ["foo", "public"],
    );
    const fooChannelId = queryResult.rows[0].id;

    const [result, channel] = await Promise.all([
      aliceSocket1.emitWithAck("channel:join", {
        channelId: fooChannelId,
      }),
      waitFor(aliceSocket2, "channel:joined"),
    ]);

    expect(result.status).to.eql("OK");

    expect(channel.id).to.eql(fooChannelId);
    expect(channel.name).to.eql("foo");
  });

  it("should fail to join an unknown channel", async () => {
    const result = await aliceSocket1.emitWithAck("channel:join", {
      channelId: "b6cdd9e7-eda2-47e4-9d69-4dd384bc2aa3",
    });

    expect(result.status).to.eql("ERROR");
  });

  it("should fail to join a channel that is already joined", async () => {
    const result = await aliceSocket1.emitWithAck("channel:join", {
      channelId: context.generalChannelId,
    });

    expect(result.status).to.eql("ERROR");
  });
});
