import { ajv, logger, userRoom } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    userIds: {
      type: "array",
      items: { type: "string", format: "uuid" },
      minItems: 1,
      maxItems: 1,
    },
  },
  required: ["userIds"],
  additionalProperties: false,
});

export function reachUser({ io, socket, db }) {
  return async (payload, callback) => {
    if (typeof callback !== "function") {
      return;
    }

    if (!validate(payload)) {
      return callback({
        status: "ERROR",
        errors: validate.errors,
      });
    }

    let channel;

    try {
      channel = await db.createPrivateChannel(socket.userId, payload.userIds);
    } catch (e) {
      return callback({
        status: "ERROR",
      });
    }

    logger.info(
      "private channel [%s] was created by user [%s]",
      channel.id,
      socket.userId,
    );

    // broadcast to other tabs of the same user
    socket.to(userRoom(socket.userId)).emit("channel:created", channel);

    io.in(userRoom(socket.userId)).socketsJoin(`channel:${channel.id}`);

    callback({
      status: "OK",
      data: channel,
    });
  };
}
