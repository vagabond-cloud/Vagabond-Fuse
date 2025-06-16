#!/bin/bash

# Start the Credential Hub service with the correct environment variables

# Set ClickHouse environment variables
export CLICKHOUSE_HOST=localhost
export CLICKHOUSE_PORT=8123
export CLICKHOUSE_USER=cs_sif
export CLICKHOUSE_PASSWORD=password
export CLICKHOUSE_DATABASE=cs_sif_analytics

echo "====================================="
echo "Starting Credential Hub service with ClickHouse environment variables:"
echo "CLICKHOUSE_HOST=$CLICKHOUSE_HOST"
echo "CLICKHOUSE_USER=$CLICKHOUSE_USER"
echo "CLICKHOUSE_DATABASE=$CLICKHOUSE_DATABASE"
echo "====================================="

# Change to the credential-hub directory
cd ../services/credential-hub

# Start the service
poetry run uvicorn app.main:app --port 8000 --reload 