import { ajv, logger } from "../util.js";
import argon2 from "argon2";

const validate = ajv.compile({
  type: "object",
  properties: {
    username: { type: "string", minLength: 2, maxLength: 32 },
    password: { type: "string", minLength: 8, maxLength: 100 },
  },
  required: ["username", "password"],
  additionalProperties: false,
});

export function signup({ app, db }) {
  app.post("/signup", async (req, res) => {
    if (!validate(req.body)) {
      return res.status(400).send({
        message: "invalid payload",
        errors: validate.errors,
      });
    }

    const hashedPassword = await argon2.hash(req.body.password);

    let userId;

    try {
      userId = await db.createUser({
        username: req.body.username,
        hashedPassword,
      });
    } catch (e) {
      return res.status(400).send({
        message: "invalid payload",
      });
    }

    logger.info("user [%s] has signed up", userId);

    // the user is logged in right away (no email address to validate)
    req.login(
      {
        id: userId,
        username: req.body.username,
      },
      () => {
        res.status(200).send(req.user);
      },
    );
  });
}
