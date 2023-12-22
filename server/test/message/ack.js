import { setup } from "./../util.js";
import { expect } from "chai";
import sql from "sql-bricks-postgres";

const { insert } = sql;

describe("message:ack", () => {
  let context, aliceSocket1, aliceSocket2, bobSocket;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
    bobSocket = context.bobSocket;

    await context.resetDatabase();

    const { text, values } = insert("messages", [
      {
        from_user: context.aliceUserId,
        channel_id: context.generalChannelId,
        content: "1",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.generalChannelId,
        content: "2",
      },
      {
        from_user: context.aliceUserId,
        channel_id: context.generalChannelId,
        content: "3",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.privateChannelId,
        content: "4",
      },
      {
        from_user: context.aliceUserId,
        channel_id: context.privateChannelId,
        content: "5",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.privateChannelId,
        content: "6",
      },
    ])
      .returning("id")
      .toParams();

    await context.pgPool.query(text, values);
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    const result = await aliceSocket1.emitWithAck("channel:list", {});

    expect(result.status).to.eql("OK");
    expect(result.data).to.eql([
      {
        id: context.generalChannelId,
        name: "General",
        type: "public",
        users: [],
        userCount: 2,
        unreadCount: 3,
      },
      {
        id: context.privateChannelId,
        name: null,
        type: "private",
        users: [context.bobUserId],
        userCount: 2,
        unreadCount: 3,
      },
    ]);

    const result2 = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
    });

    const result3 = await aliceSocket1.emitWithAck("message:ack", {
      channelId: context.generalChannelId,
      messageId: result2.data[2].id,
    });

    expect(result3.status).to.eql("OK");

    const result4 = await aliceSocket1.emitWithAck("channel:list", {});

    expect(result4.data[0].unreadCount).to.eql(0);
    expect(result4.data[1].unreadCount).to.eql(3);

    await aliceSocket1.emitWithAck("message:send", {
      channelId: context.generalChannelId,
      content: "hello",
    });

    const result5 = await aliceSocket1.emitWithAck("channel:list", {});

    expect(result5.data[0].unreadCount).to.eql(0);
  });
});
