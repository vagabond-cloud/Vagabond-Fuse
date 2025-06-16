import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.stats_service import StatsService, CLICKHOUSE_AVAILABLE


@pytest.fixture
def client():
    return TestClient(app)


# Use a conditional to skip fixture creation instead of marking the fixture
if CLICKHOUSE_AVAILABLE:
    @pytest.fixture
    def mock_clickhouse_client():
        """Mock ClickHouse client for testing"""
        with patch("clickhouse_connect.get_client") as mock_client:
            # Create a mock query result for issued credentials
            issued_mock = MagicMock()
            issued_mock.first_row = [100]
            issued_mock.row_count = 1
            
            # Create a mock query result for verified credentials
            verified_mock = MagicMock()
            verified_mock.first_row = [75]
            verified_mock.row_count = 1
            
            # Create a mock query result for revoked credentials
            revoked_mock = MagicMock()
            revoked_mock.first_row = [25]
            revoked_mock.row_count = 1
            
            # Setup the mock client to return our mock results
            mock_instance = mock_client.return_value
            mock_instance.query.side_effect = [issued_mock, verified_mock, revoked_mock]
            
            yield mock_client
else:
    @pytest.fixture
    def mock_clickhouse_client():
        pytest.skip("ClickHouse client not available")


def test_stats_endpoint_fallback(client):
    """Test the /stats endpoint with fallback values"""
    # Test that the endpoint returns fallback values
    response = client.get("/stats")
    assert response.status_code == 200
    data = response.json()
    
    # Check that the response contains the expected fields
    assert "issued" in data
    assert "verified" in data
    assert "revoked" in data
    assert "timestamp" in data
    
    # The values should be the fallback values (0) if ClickHouse is not available
    # or the mocked values if it is available
    assert isinstance(data["issued"], int)
    assert isinstance(data["verified"], int)
    assert isinstance(data["revoked"], int)


@pytest.mark.skipif(not CLICKHOUSE_AVAILABLE, reason="ClickHouse client not available")
def test_stats_endpoint_success(client, mock_clickhouse_client):
    """Test the /stats endpoint with successful ClickHouse response"""
    response = client.get("/stats")
    assert response.status_code == 200
    data = response.json()
    
    # Check that the response contains the expected fields
    assert "issued" in data
    assert "verified" in data
    assert "revoked" in data
    assert "timestamp" in data
    
    # Check the values match our mock data
    assert data["issued"] == 100
    assert data["verified"] == 75
    assert data["revoked"] == 25


@pytest.mark.skipif(not CLICKHOUSE_AVAILABLE, reason="ClickHouse client not available")
def test_stats_endpoint_clickhouse_failure(client):
    """Test the /stats endpoint when ClickHouse connection fails"""
    # Mock the StatsService.get_credential_stats method to simulate a failure
    with patch("app.services.stats_service.StatsService.get_credential_stats") as mock_get_stats:
        # Simulate ClickHouse connection failure but return fallback values
        mock_get_stats.return_value = {"issued": 0, "verified": 0, "revoked": 0}
        
        response = client.get("/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check that the response contains the fallback values
        assert data["issued"] == 0
        assert data["verified"] == 0
        assert data["revoked"] == 0
        assert "timestamp" in data


@pytest.mark.skipif(not CLICKHOUSE_AVAILABLE, reason="ClickHouse client not available")
def test_stats_service_get_credential_stats():
    """Test the StatsService.get_credential_stats method directly"""
    with patch("clickhouse_connect.get_client") as mock_client:
        # Setup mock query results
        issued_mock = MagicMock()
        issued_mock.first_row = [50]
        issued_mock.row_count = 1
        
        verified_mock = MagicMock()
        verified_mock.first_row = [30]
        verified_mock.row_count = 1
        
        revoked_mock = MagicMock()
        revoked_mock.first_row = [10]
        revoked_mock.row_count = 1
        
        # Setup the mock client
        mock_instance = mock_client.return_value
        mock_instance.query.side_effect = [issued_mock, verified_mock, revoked_mock]
        
        # Create a stats service instance
        stats_service = StatsService()
        
        # Call the method
        import asyncio
        stats = asyncio.run(stats_service.get_credential_stats())
        
        # Check the result
        assert stats["issued"] == 50
        assert stats["verified"] == 30
        assert stats["revoked"] == 10


def test_stats_service_fallback():
    """Test the StatsService fallback when ClickHouse is not available"""
    # Create a stats service instance
    stats_service = StatsService()
    
    # Call the method
    import asyncio
    stats = asyncio.run(stats_service.get_credential_stats())
    
    # Check the fallback values
    assert stats["issued"] == 0
    assert stats["verified"] == 0
    assert stats["revoked"] == 0 