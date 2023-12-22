import { ajv } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    channelId: { type: "string", format: "uuid" },
    messageId: { type: "string" },
  },
  required: ["channelId", "messageId"],
  additionalProperties: false,
});

export function ackMessage({ socket, db }) {
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

    try {
      await db.ackMessage(socket.userId, payload);
    } catch (e) {
      return callback({
        status: "ERROR",
      });
    }

    callback({
      status: "OK",
    });
  };
}
