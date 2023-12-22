import { ajv, userStateRoom } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    userId: { type: "string", format: "uuid" },
  },
  additionalProperties: false,
});

export function getUser({ socket, db }) {
  return async (query, callback) => {
    if (typeof callback !== "function") {
      return;
    }

    if (!validate(query)) {
      return callback({
        status: "ERROR",
        errors: validate.errors,
      });
    }

    const user = await db.getUser(query.userId);

    if (user) {
      // the user will be notified of any change of the user state
      socket.join(userStateRoom(user.id));

      callback({
        status: "OK",
        data: user,
      });
    } else {
      callback({
        status: "ERROR",
      });
    }
  };
}
