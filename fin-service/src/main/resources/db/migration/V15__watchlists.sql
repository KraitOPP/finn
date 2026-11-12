
CREATE TABLE finn.watchlist (
    watchlist_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id), name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), UNIQUE(owner_id,watchlist_id)
);
CREATE UNIQUE INDEX watchlist_unique_name ON finn.watchlist(owner_id,lower(name));
CREATE TABLE finn.watchlist_item (
    owner_id UUID NOT NULL, watchlist_id UUID NOT NULL, listing_id UUID NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,watchlist_id,listing_id),
    FOREIGN KEY(owner_id,watchlist_id) REFERENCES finn.watchlist(owner_id,watchlist_id),
    FOREIGN KEY(owner_id,listing_id) REFERENCES finn.listing(owner_id,listing_id)
);
GRANT SELECT,INSERT ON finn.watchlist TO finn_app;
GRANT SELECT,INSERT,DELETE ON finn.watchlist_item TO finn_app;
