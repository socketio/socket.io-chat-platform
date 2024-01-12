import sql from "sql-bricks-postgres";
import { doInTransaction } from "./util.js";

const { select, ilike, eq, not, lt, gt } = sql;

function escape(str) {
  return str.replaceAll("~", "~~").replaceAll("%", "~%").replaceAll("_", "~_");
}

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    isOnline: row.is_online,
  };
}

function mapChannel(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    users: row.users,
    userCount: parseInt(row.user_count, 10),
    unreadCount: parseInt(row.unread_count, 10),
  };
}

async function getChannel(client, userId, channelId) {
  const result = await client.query(
    `
    SELECT
      c.id,
      c.name,
      c.type,
      (
        SELECT count(*) FROM user_channels WHERE channel_id = c.id
      ) as user_count,
      (
        CASE WHEN c.type = 'public' IS TRUE
        THEN ARRAY[]::uuid[]
        ELSE ARRAY(
          SELECT uc2.user_id 
          FROM user_channels uc2
          WHERE uc2.channel_id = c.id
          AND uc2.user_id <> $1
        )
        END
      ) as users,
      (
        SELECT count(*) FROM messages WHERE channel_id = c.id AND id > COALESCE(uc.client_offset, 0)
      ) as unread_count
    FROM channels c
    JOIN user_channels uc ON uc.channel_id = c.id
    WHERE
      uc.user_id = $1
      AND c.id = $2
  `,
    [userId, channelId],
  );

  return result.rowCount === 1 ? mapChannel(result.rows[0]) : undefined;
}

export class DB {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  async findUserByUsername(username) {
    const result = await this.pgPool.query(
      "SELECT id, password FROM users WHERE username = $1",
      [username],
    );

    return result.rows[0];
  }

  createUser({ username, hashedPassword }) {
    return doInTransaction(this.pgPool, async (client) => {
      const results = await Promise.all([
        client.query(
          "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
          [username, hashedPassword],
        ),
        client.query("SELECT id FROM channels WHERE name = 'General'"),
      ]);

      const userId = results[0].rows[0].id;
      const channelId = results[1].rows[0].id;

      client.query(
        "INSERT INTO user_channels (user_id, channel_id) VALUES ($1, $2)",
        [userId, channelId],
      );

      return userId;
    });
  }

  async setUserIsConnected(userId) {
    const result = await this.pgPool.query(
      `
      UPDATE users u
      SET
        is_online = true,
        last_ping = NOW()
      FROM
        (SELECT id, is_online FROM users WHERE id = $1 FOR UPDATE) old_u
      WHERE
        u.id = old_u.id
      RETURNING old_u.is_online AS was_online;
    `,
      [userId],
    );

    return result.rowCount === 1 ? result.rows[0].was_online : false;
  }

  async setUserIsDisconnected(userId) {
    await this.pgPool.query(
      `
      UPDATE users
      SET
        is_online = false
      WHERE
        id = $1
      `,
      [userId],
    );
  }

  async cleanupZombieUsers() {
    const result = await this.pgPool.query(
      `
        UPDATE users
        SET
          is_online = false
        WHERE
          is_online = true
          AND last_ping < NOW() - INTERVAL '1 day'
        RETURNING id;
      `,
    );

    return result.rows.map((row) => row.id);
  }

  async isUserInChannel(userId, channelId) {
    const result = await this.pgPool.query(
      "SELECT 1 FROM user_channels WHERE channel_id = $1 AND user_id = $2",
      [channelId, userId],
    );

    return result.rowCount === 1;
  }

  async getUser(userId) {
    const result = await this.pgPool.query(
      `
        SELECT
          id,
          username,
          is_online
        FROM users
        WHERE
          id = $1
      `,
      [userId],
    );

    return result.rowCount === 1 ? mapUser(result.rows[0]) : undefined;
  }

  async searchUsers(userId, { q, size }) {
    const query = `
      SELECT
        id,
        username
      FROM users
      WHERE
        username ILIKE $2 ESCAPE '~'
        AND id <> $1
        AND id NOT IN (
          SELECT
            DISTINCT user_id
          FROM user_channels
          WHERE channel_id IN (
            SELECT channel_id
            FROM channels c
            JOIN user_channels uc ON uc.channel_id = c.id
            WHERE
              uc.user_id = $1
              AND c.type = 'private'
          )
        )
      LIMIT $3
    `;

    const params = [userId, escape(q) + "%", size];
    const result = await this.pgPool.query(query, params);

    return result.rows;
  }

  async createPublicChannel(userId, { name }) {
    return doInTransaction(this.pgPool, async (client) => {
      const result = await client.query(
        "INSERT INTO channels (name, type) VALUES ($1, $2) RETURNING id",
        [name, "public"],
      );

      const channelId = result.rows[0].id;

      await client.query(
        "INSERT INTO user_channels(user_id, channel_id) VALUES ($1, $2)",
        [userId, channelId],
      );

      return getChannel(client, userId, channelId);
    });
  }

  async createPrivateChannel(userId, userIds) {
    return doInTransaction(this.pgPool, async (client) => {
      const result = await client.query(
        "INSERT INTO channels (type) VALUES ('private') RETURNING id",
      );

      const channelId = result.rows[0].id;

      await client.query(
        "INSERT INTO user_channels(user_id, channel_id) VALUES ($1, $3), ($2, $3)",
        [userId, userIds[0], channelId],
      );

      return getChannel(client, userId, channelId);
    });
  }

  async joinChannel(userId, channelId) {
    return doInTransaction(this.pgPool, async (client) => {
      await client.query(
        "INSERT INTO user_channels (user_id, channel_id) VALUES ($1, $2)",
        [userId, channelId],
      );

      return getChannel(client, userId, channelId);
    });
  }

  async listChannels(userId, query) {
    const subQuery = sql(
      `
      CASE WHEN c.type = 'public' IS TRUE
        THEN ARRAY[]::uuid[]
        ELSE
          ARRAY(
            SELECT uc2.user_id
            FROM user_channels uc2
            WHERE uc2.channel_id = c.id
            AND uc2.user_id <> $1
          )
        END
      as users
    `,
      [userId],
    );

    const userCountSubQuery = sql(
      `(SELECT count(*) FROM user_channels WHERE channel_id = c.id) as user_count`,
    );
    const unreadCountSubQuery = sql(
      `(SELECT count(*) FROM messages WHERE channel_id = c.id AND id > COALESCE(uc.client_offset, 0)) as unread_count`,
    );

    let sqlQuery = select(
      "c.id",
      "c.name",
      "c.type",
      subQuery,
      userCountSubQuery,
      unreadCountSubQuery,
    )
      .from("channels c")
      .join("user_channels uc", { "uc.channel_id": "c.id" })
      .where(eq("uc.user_id", userId))
      .limit(query.size + 1);

    switch (query.orderBy) {
      case "name:asc":
        sqlQuery = sqlQuery.orderBy("name ASC");
        break;
    }

    const { text, values } = sqlQuery.toParams();
    const result = await this.pgPool.query(text, values);

    const hasMore = result.rowCount > query.size;

    if (hasMore) {
      result.rows.pop();
    }

    return {
      data: result.rows.map(mapChannel),
      hasMore,
    };
  }

  async searchChannels(userId, { q, size }) {
    const usersInChannelSubQuery = sql(
      `
      ARRAY(
        SELECT uc.user_id
        FROM user_channels uc
        WHERE uc.channel_id = c.id
        AND uc.user_id <> $1
      )
      as users
    `,
      [userId],
    );

    const alreadyJoinedChannels = select("channel_id")
      .from("user_channels")
      .where(eq("user_id", userId));

    const sqlQuery = select("c.id", "c.name", "c.type", usersInChannelSubQuery)
      .from("channels c")
      .where(ilike("name", escape(q) + "%", "~"))
      .where(not(sql.in("c.id", alreadyJoinedChannels)))
      .limit(size);

    const { text, values } = sqlQuery.toParams();
    const result = await this.pgPool.query(text, values);

    return result.rows.map(mapChannel);
  }

  async fetchUserChannels(userId) {
    const result = await this.pgPool.query(
      "SELECT channel_id FROM user_channels WHERE user_id = $1",
      [userId],
    );

    return result.rows.map((row) => row.channel_id);
  }

  insertMessage(message) {
    return doInTransaction(this.pgPool, async (client) => {
      const params = [message.from, message.channelId, message.content];
      const result = await client.query(
        "INSERT INTO messages (from_user, channel_id, content) VALUES ($1, $2, $3) RETURNING id",
        params,
      );

      const messageId = result.rows[0].id;

      client.query(
        `
        UPDATE user_channels
        SET client_offset = $1
        WHERE
          user_id = $2
          AND channel_id = $3
        `,
        [messageId, message.from, message.channelId],
      );

      return messageId;
    });
  }

  async listMessages(query) {
    let sqlQuery = select("id", "from_user", "channel_id", "content")
      .from("messages")
      .where(eq("channel_id", query.channelId))
      .limit(query.size + 1);

    switch (query.orderBy) {
      case "id:asc":
        sqlQuery = sqlQuery.orderBy("id ASC");
        if (query.after) {
          sqlQuery = sqlQuery.where(gt("id", query.after));
        }
        break;
      case "id:desc":
        sqlQuery = sqlQuery.orderBy("id DESC");
        if (query.after) {
          sqlQuery = sqlQuery.where(lt("id", query.after));
        }
        break;
    }

    const { text, values } = sqlQuery.toParams();
    const result = await this.pgPool.query(text, values);

    const hasMore = result.rowCount > query.size;

    if (hasMore) {
      result.rows.pop();
    }

    return {
      data: result.rows.map((row) => ({
        id: row.id,
        channelId: row.channel_id,
        from: row.from_user,
        content: row.content,
      })),
      hasMore,
    };
  }

  ackMessage(userId, { channelId, messageId }) {
    return this.pgPool.query(
      `
      UPDATE user_channels
      SET
        client_offset = $1
      WHERE
        user_id = $2
        AND channel_id = $3
        AND (client_offset IS NULL OR client_offset < $1)
      `,
      [messageId, userId, channelId],
    );
  }
}
