import { logger, sessionRoom } from "../util.js";

export function logout({ app, io }) {
  app.post("/logout", (req, res, next) => {
    const sessionId = req.session.id;
    const userId = req.user.id;

    req.logout((err) => {
      if (err) {
        return next(err);
      }

      logger.info(
        "user [%s] has logged out from session [%s]",
        userId,
        sessionId,
      );

      io.in(sessionRoom(sessionId)).disconnectSockets();

      res.status(204).end();
    });
  });
}
