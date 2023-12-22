import { ajv, logger, userRoom } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    name: { type: "string", minLength: 2, maxLength: 32 },
  },
  required: ["name"],
  additionalProperties: false,
});

export function createChannel({ io, socket, db }) {
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
      channel = await db.createPublicChannel(socket.userId, payload);
    } catch (e) {
      return callback({
        status: "ERROR",
      });
    }

    logger.info(
      "public channel [%s] was created by user [%s]",
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
