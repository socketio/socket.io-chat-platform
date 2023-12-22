import passport from "passport";
import { logger } from "../util.js";

function onSuccess(req, res) {
  logger.info("user [%s] has logged in", req.user.id);

  res.status(200).send(req.user);
}

function onError(_err, _req, res, _next) {
  res.status(400).send({
    message: "invalid credentials",
  });
}

export function login({ app }) {
  app.post("/login", passport.authenticate("json"), onSuccess, onError);
}
