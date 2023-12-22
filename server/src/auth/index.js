import { signup } from "./signup.js";
import { login } from "./login.js";
import { logout } from "./logout.js";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { Strategy as JsonStrategy } from "passport-json";
import argon2 from "argon2";
import { self } from "./self.js";

const _30_DAYS = 30 * 24 * 60 * 60 * 1000;

export function initAuth({ app, io, db, config }) {
  setupSession({ app, io, db, config });
  setupPassport({ app, io, db });

  login({ app });
  logout({ app, io });
  signup({ app, db });
  self({ app });
}

function setupSession({ app, io, db, config }) {
  const sessionMiddleware = session({
    name: "sid",
    secret: config.sessionSecrets,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: _30_DAYS,
      sameSite: "lax",
    },
    store: new (pgSession(session))({
      pool: db.pgPool,
      tableName: "sessions",
    }),
  });

  app.use(sessionMiddleware);
  io.engine.use(sessionMiddleware);
}

function setupPassport({ app, io, db }) {
  passport.use(
    new JsonStrategy(async (username, password, done) => {
      const user = await db.findUserByUsername(username);

      if (!user) {
        return done(new Error("invalid credentials"));
      }

      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        return done(new Error("invalid credentials"));
      }

      done(null, {
        id: user.id,
        username,
      });
    }),
  );

  passport.serializeUser((user, cb) => {
    cb(null, {
      id: user.id,
      username: user.username,
    });
  });

  passport.deserializeUser((user, cb) => {
    cb(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  io.engine.use((req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.writeHead(401);
      res.end();
    }
  });
}
