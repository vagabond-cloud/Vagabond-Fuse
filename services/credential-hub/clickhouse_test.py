#!/usr/bin/env python3
"""
Test script to insert events directly into ClickHouse
"""

import clickhouse_connect
from datetime import datetime

def main():
    print("Testing ClickHouse insertion...")
    
    try:
        # Connect to ClickHouse
        client = clickhouse_connect.get_client(
            host="localhost",
            port=8123,
            username="default",
            database="credential_hub"
        )
        
        print("Connected to ClickHouse")
        
        # Insert a test event - using a list of values in the exact column order
        # Order: event_type, credential_id, subject_id, issuer_id, timestamp, result, details, metadata
        event_data = [
            "issue",                                  # event_type
            "test-credential-id-3",                   # credential_id
            "test-subject",                           # subject_id
            "test-issuer",                            # issuer_id
            datetime.now(),                           # timestamp (as datetime object)
            "success",                                # result
            "Test event",                             # details
            "{}"                                      # metadata
        ]
        
        print(f"Inserting event with values: {event_data}")
        
        client.insert(
            "credential_events",
            [event_data],
            column_names=[
                "event_type",
                "credential_id",
                "subject_id",
                "issuer_id",
                "timestamp",
                "result",
                "details",
                "metadata"
            ]
        )
        
        print("Event inserted successfully")
        
        # Query the event
        result = client.query("SELECT * FROM credential_events WHERE credential_id = 'test-credential-id-3'")
        
        print(f"Query result: {result.result_rows}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main() 