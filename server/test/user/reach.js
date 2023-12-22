import { expect } from "chai";
import { setup, waitFor } from "./../util.js";

describe("user:reach", () => {
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
    const queryResult = await context.pgPool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2), ($3, $4) RETURNING id",
      ["carol", "", "dan", ""],
    );

    const carolUserId = queryResult.rows[0].id;

    const [result, channel] = await Promise.all([
      aliceSocket1.emitWithAck("user:reach", {
        userIds: [carolUserId],
      }),
      waitFor(aliceSocket2, "channel:created"),
    ]);

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.be.a("string");

    expect(channel.id).to.eql(result.data.id);
    expect(channel.type).to.eql("private");
    expect(channel.users).to.eql([carolUserId]);
  });
});
