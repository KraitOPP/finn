CREATE TABLE finn.user_preferences (
    owner_id UUID PRIMARY KEY REFERENCES finn.app_user(user_id),
    time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    currency CHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency='INR'),
    in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
GRANT SELECT, INSERT ON finn.user_preferences TO finn_app;
GRANT UPDATE(time_zone, in_app_notifications, email_notifications, revision) ON finn.user_preferences TO finn_app;
