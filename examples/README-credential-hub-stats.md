# Credential Hub Stats Example

This example demonstrates how to use the new `/stats` endpoint in the Credential Hub service to retrieve and visualize credential statistics.

## Features

- Retrieve credential statistics (issued, verified, revoked counts)
- Issue, verify, and revoke credentials to see stats change
- Generate visualizations of credential statistics (Python version only)

## Prerequisites

### Python Version

- Python 3.11+
- Credential Hub service running on `http://localhost:8000`
- ClickHouse server running (see setup instructions below)
- Required Python packages:
  - `requests`
  - `matplotlib` (for visualization)
  - `pandas` (for data manipulation)

### TypeScript Version

- Node.js (v18+)
- pnpm (v8+) or npm (v9+)
- Credential Hub service running on `http://localhost:8000`
- ClickHouse server running (see setup instructions below)
- Required Node.js packages:
  - `axios`
  - `uuid`

## Installation

### Python Version

1. Install the required dependencies:

```bash
pip install requests matplotlib pandas
```

### TypeScript Version

1. Install the required dependencies:

```bash
cd examples
pnpm install  # or npm install
```

### ClickHouse Setup

The stats functionality requires a ClickHouse server. You can set it up using Docker:

```bash
# Start ClickHouse server
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server

# Initialize the database and tables
cat services/credential-hub/setup_clickhouse.sql | docker exec -i clickhouse-server clickhouse-client
```

## Running the Example

1. Make sure the ClickHouse server is running (see setup instructions above)

2. Start the Credential Hub service:

```bash
cd services/credential-hub
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. In a separate terminal, run the example:

### Python Version

```bash
cd examples
python credential-hub-stats-example.py
```

### TypeScript Version

```bash
cd examples
npx ts-node credential-hub-stats-example.ts
# or
pnpm run credential-hub:stats:ts
```

## What the Example Does

1. Retrieves initial credential statistics
2. Issues 5 new credentials
3. Verifies 3 of the issued credentials
4. Revokes 2 of the credentials
5. Retrieves updated statistics after each operation
6. Generates visualizations of the statistics (Python version only)

## Visualization

The Python version generates two visualization files:

- `credential_stats.png`: A bar chart showing the current counts of issued, verified, and revoked credentials
- `credential_stats_history.png`: A line chart showing how these counts changed over time during the example execution

The TypeScript version does not generate visualizations but provides the same statistics in the console output.

## Error Handling

The example includes error handling to gracefully handle cases where:

- The Credential Hub service is not running
- API calls fail
- Visualization dependencies are not installed (Python version)

## API Reference

The `/stats` endpoint returns a JSON object with the following structure:

```json
{
  "issued": 5,
  "verified": 3,
  "revoked": 2,
  "timestamp": "2023-06-01T12:34:56.789Z"
}
```

Where:

- `issued`: Number of credentials issued
- `verified`: Number of credentials verified
- `revoked`: Number of credentials revoked
- `timestamp`: When the statistics were generated

## Troubleshooting

If you encounter ClickHouse connection issues:

1. Make sure the ClickHouse server is running:

   ```bash
   docker ps | grep clickhouse
   ```

2. If you see authentication errors, the Credential Hub service is configured to use no password for the default user, which matches the default Docker container configuration.
