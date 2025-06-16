import json
import os
from pathlib import Path
import pytest
from typing import Dict, Any
from unittest.mock import patch, MagicMock, mock_open

from app.services.evaluator import PolicyEvaluator


# Path to the OPA directory
OPA_DIR = Path(os.path.dirname(os.path.dirname(__file__))) / "opa"


@pytest.fixture
def policy_evaluator():
    """Create a PolicyEvaluator instance for testing."""
    evaluator = PolicyEvaluator(wasm_dir=OPA_DIR)
    
    # Mock the _load_wasm_module method to avoid actual WASM loading
    original_load_wasm_module = evaluator._load_wasm_module
    
    def mock_load_wasm_module(*args, **kwargs):
        # Just return a mock module and instance
        class MockModule:
            pass
        
        class MockInstance:
            def __init__(self):
                self.exports = {}
        
        return MockModule(), MockInstance()
    
    # Replace the method
    evaluator._load_wasm_module = mock_load_wasm_module
    
    yield evaluator
    
    # Restore the original method
    evaluator._load_wasm_module = original_load_wasm_module


def test_init_default_wasm_dir():
    """Test initializing PolicyEvaluator with default wasm_dir."""
    with patch('pathlib.Path.mkdir') as mock_mkdir:
        evaluator = PolicyEvaluator()
        assert evaluator.wasm_dir.name == "opa"
        assert isinstance(evaluator.engine, object)
        assert isinstance(evaluator.store, object)
        assert evaluator._module_cache == {}


def test_init_custom_wasm_dir():
    """Test initializing PolicyEvaluator with custom wasm_dir."""
    custom_dir = Path("/custom/wasm/dir")
    evaluator = PolicyEvaluator(wasm_dir=custom_dir)
    assert evaluator.wasm_dir == custom_dir


def test_load_wasm_module_from_cache():
    """Test loading a WASM module from cache."""
    evaluator = PolicyEvaluator()
    
    # Create a mock module and instance
    mock_module = MagicMock()
    mock_instance = MagicMock()
    
    # Add to cache
    evaluator._module_cache["test_allow"] = (mock_module, mock_instance)
    
    # Load from cache
    module, instance = evaluator._load_wasm_module("test", "allow")
    
    # Verify
    assert module is mock_module
    assert instance is mock_instance


def test_load_wasm_module_allow():
    """Test loading a WASM module with 'allow' entrypoint."""
    with patch('builtins.open', mock_open(read_data=b'\0asm\1\0\0\0')) as mock_file, \
         patch('pathlib.Path.exists', return_value=True), \
         patch('wasmtime.Module') as mock_module_cls, \
         patch('wasmtime.Instance') as mock_instance_cls:
        
        # Set up mocks
        mock_module = MagicMock()
        mock_instance = MagicMock()
        mock_module_cls.return_value = mock_module
        mock_instance_cls.return_value = mock_instance
        
        # Create evaluator and load module
        evaluator = PolicyEvaluator()
        module, instance = evaluator._load_wasm_module("test_policy", "allow")
        
        # Verify
        mock_file.assert_called_once_with(evaluator.wasm_dir / "test_policy.wasm", "rb")
        assert module is mock_module
        assert instance is mock_instance
        assert evaluator._module_cache["test_policy_allow"] == (mock_module, mock_instance)


def test_load_wasm_module_custom_entrypoint():
    """Test loading a WASM module with a custom entrypoint."""
    with patch('builtins.open', mock_open(read_data=b'\0asm\1\0\0\0')) as mock_file, \
         patch('pathlib.Path.exists', return_value=True), \
         patch('wasmtime.Module') as mock_module_cls, \
         patch('wasmtime.Instance') as mock_instance_cls:
        
        # Set up mocks
        mock_module = MagicMock()
        mock_instance = MagicMock()
        mock_module_cls.return_value = mock_module
        mock_instance_cls.return_value = mock_instance
        
        # Create evaluator and load module
        evaluator = PolicyEvaluator()
        module, instance = evaluator._load_wasm_module("test_policy", "reasons")
        
        # Verify
        mock_file.assert_called_once_with(evaluator.wasm_dir / "test_policy_reasons.wasm", "rb")
        assert module is mock_module
        assert instance is mock_instance
        assert evaluator._module_cache["test_policy_reasons"] == (mock_module, mock_instance)


def test_load_wasm_module_file_not_found():
    """Test loading a WASM module when the file doesn't exist."""
    with patch('pathlib.Path.exists', return_value=False):
        evaluator = PolicyEvaluator()
        with pytest.raises(FileNotFoundError):
            evaluator._load_wasm_module("nonexistent", "allow")


# Test cases for GDPR policy evaluation
# Each test case consists of:
# - input_json: The input data to evaluate
# - expected_allow: Whether the policy should allow the input
# - expected_reasons: The reasons for the decision
@pytest.mark.parametrize(
    "input_json,expected_allow,expected_reasons",
    [
        # Case 1: User has consented to data processing for a valid purpose
        (
            {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing"
            },
            True,
            ["User has provided consent", "Purpose is specified", "Purpose is allowed"]
        ),
        # Case 2: User has not consented to data processing
        (
            {
                "user": {
                    "consent": False,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing"
            },
            False,
            ["User has not provided consent", "Purpose is specified", "Purpose is allowed"]
        ),
        # Case 3: Purpose is not specified
        (
            {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": None
            },
            False,
            ["User has provided consent", "Purpose is not specified"]
        ),
        # Case 4: Purpose is not allowed
        (
            {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "profiling"
            },
            False,
            ["User has provided consent", "Purpose is specified", "Purpose is not allowed"]
        ),
        # Case 5: Empty input
        (
            {},
            False,
            ["User has not provided consent", "Purpose is not specified"]
        ),
        # Case 6: Missing user
        (
            {"purpose": "marketing"},
            False,
            ["User has not provided consent", "Purpose is specified"]
        ),
        # Case 7: Missing allowed_purposes
        (
            {"user": {"consent": True}, "purpose": "marketing"},
            False,
            ["User has provided consent", "Purpose is specified", "Purpose is not allowed"]
        ),
    ]
)
def test_evaluate_credential(
    policy_evaluator: PolicyEvaluator,
    input_json: Dict[str, Any],
    expected_allow: bool,
    expected_reasons: list[str]
):
    """Test the evaluate_credential method."""
    result = policy_evaluator.evaluate_credential(input_json)
    
    assert "allow" in result
    assert result["allow"] == expected_allow
    
    assert "reasons" in result
    for reason in expected_reasons:
        assert reason in result["reasons"]


def test_evaluate_credential_with_invalid_policy():
    """Test evaluating a credential with an invalid policy."""
    # Create a policy evaluator with an invalid wasm_dir
    evaluator = PolicyEvaluator(wasm_dir=Path("/nonexistent"))
    
    # Force the evaluator to try to load a non-existent WASM module
    evaluator._module_cache = {}  # Clear the cache
    
    # Mock the _load_wasm_module method to raise FileNotFoundError
    original_load_wasm_module = evaluator._load_wasm_module
    
    def mock_load_wasm_module(*args, **kwargs):
        raise FileNotFoundError("WASM module not found")
    
    # Replace the method
    evaluator._load_wasm_module = mock_load_wasm_module
    
    try:
        # Call evaluate_credential which should catch the exception
        result = evaluator.evaluate_credential({})
        
        # Check the result
        assert "allow" in result
        assert result["allow"] is False
        assert "reasons" in result
        assert len(result["reasons"]) == 1
        assert "Error evaluating policy" in result["reasons"][0]
    finally:
        # Restore the original method
        evaluator._load_wasm_module = original_load_wasm_module


def test_evaluate_credential_with_generic_exception():
    """Test evaluating a credential with a generic exception."""
    # Create a policy evaluator
    evaluator = PolicyEvaluator()
    
    # Mock the _load_wasm_module method to raise a generic exception
    original_load_wasm_module = evaluator._load_wasm_module
    
    def mock_load_wasm_module(*args, **kwargs):
        raise ValueError("Generic error")
    
    # Replace the method
    evaluator._load_wasm_module = mock_load_wasm_module
    
    try:
        # Call evaluate_credential which should catch the exception
        result = evaluator.evaluate_credential({})
        
        # Check the result
        assert "allow" in result
        assert result["allow"] is False
        assert "reasons" in result
        assert len(result["reasons"]) == 1
        assert "Error evaluating policy" in result["reasons"][0]
        assert "Generic error" in result["reasons"][0]
    finally:
        # Restore the original method
        evaluator._load_wasm_module = original_load_wasm_module 