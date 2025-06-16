-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS credential_hub;

-- Switch to the database
USE credential_hub;

-- Create the credential_events table
CREATE TABLE IF NOT EXISTS credential_events (
    event_id UUID DEFAULT generateUUIDv4(),
    event_type Enum('issue', 'verify', 'revoke'),
    credential_id String,
    subject_id String,
    issuer_id String,
    timestamp DateTime DEFAULT now(),
    result Enum('success', 'failure') DEFAULT 'success',
    details String DEFAULT '',
    metadata String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (timestamp, credential_id);

-- Create a view for credential stats
CREATE VIEW IF NOT EXISTS credential_stats AS
SELECT
    countIf(event_type = 'issue') AS issued,
    countIf(event_type = 'verify' AND result = 'success') AS verified,
    countIf(event_type = 'revoke') AS revoked
FROM credential_events; 