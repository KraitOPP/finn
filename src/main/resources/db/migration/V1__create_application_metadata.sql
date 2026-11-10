CREATE TABLE finn.application_metadata (
    metadata_key VARCHAR(64) PRIMARY KEY,
    metadata_value VARCHAR(128) NOT NULL
);

INSERT INTO finn.application_metadata (metadata_key, metadata_value)
VALUES ('data_mode', 'PUBLIC_SYNTHETIC');

GRANT SELECT ON finn.application_metadata TO finn_app;
