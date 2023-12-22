import { logger, userRoom } from "../util.js";

export function logout({ app, io }) {
  app.post("/logout", (req, res, next) => {
    const userId = req.user.id;

    req.logout((err) => {
      if (err) {
        return next(err);
      }

      logger.info("user [%s] has logged out", userId);

      io.in(userRoom(userId)).disconnectSockets();

      res.status(204).end();
    });
  });
}
