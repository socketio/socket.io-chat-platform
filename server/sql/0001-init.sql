-- needed by express-session
CREATE TABLE sessions
(
    sid    varchar PRIMARY KEY,
    sess   json         NOT NULL,
    expire timestamp(6) NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions (expire);

-- needed by @socket.io/postgres-adapter
CREATE TABLE socket_io_attachments
(
    id         bigserial UNIQUE,
    created_at timestamptz DEFAULT NOW(),
    payload    bytea
);

CREATE TABLE users
(
    id         uuid PRIMARY KEY default gen_random_uuid(),
    created_at timestamptz      DEFAULT NOW(),
    username   text NOT NULL UNIQUE,
    password   text NOT NULL,
    is_online  boolean          DEFAULT true,
    last_ping  timestamptz      DEFAULT NOW()
);

CREATE TYPE channel_type AS ENUM ('public', 'private');

CREATE TABLE channels
(
    id         uuid PRIMARY KEY default gen_random_uuid(),
    created_at timestamptz      DEFAULT NOW(),
    name       text UNIQUE,
    type       channel_type NOT NULL
);

CREATE TABLE messages
(
    id         bigserial PRIMARY KEY,
    created_at timestamptz DEFAULT NOW(),
    from_user  uuid NOT NULL REFERENCES users (id),
    channel_id uuid REFERENCES channels (id),
    content    text
);

CREATE INDEX idx_messages_channel_id ON messages (channel_id);

CREATE TABLE user_channels
(
    user_id       uuid NOT NULL REFERENCES users (id),
    channel_id    uuid NOT NULL REFERENCES channels (id),
    client_offset bigint REFERENCES messages (id)
);

CREATE UNIQUE INDEX idx_user_channels_user_id_channel_id ON user_channels (user_id, channel_id);

INSERT INTO channels (name, type)
VALUES ('General', 'public');
