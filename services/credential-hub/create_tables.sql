-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS cs_sif_analytics;

-- Create the credential_events table
CREATE TABLE IF NOT EXISTS cs_sif_analytics.credential_events (
  event_type String,
  credential_id String,
  subject_id String,
  issuer_id String,
  timestamp DateTime,
  result String,
  details String,
  metadata String
) ENGINE = MergeTree()
ORDER BY (timestamp, credential_id); 