#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path

# Load environment variables from .env file
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    print(f"Loading environment variables from {env_file}")
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ[key] = value
                print(f"Set {key}={value}")

# Set up ClickHouse environment variables for the StatsService
if "CLICKHOUSE_HOST" in os.environ:
    print(f"Using ClickHouse host: {os.environ['CLICKHOUSE_HOST']}")
if "CLICKHOUSE_USER" in os.environ:
    print(f"Using ClickHouse user: {os.environ['CLICKHOUSE_USER']}")
if "CLICKHOUSE_DATABASE" in os.environ:
    print(f"Using ClickHouse database: {os.environ['CLICKHOUSE_DATABASE']}")

# Start the service with uvicorn
port = os.environ.get("PORT", "8000")
print(f"Starting service on port {port}")
cmd = ["uvicorn", "app.main:app", "--port", port, "--reload"]
subprocess.run(cmd) 