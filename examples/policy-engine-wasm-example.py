#!/usr/bin/env python3
"""
Example demonstrating how to use the Policy Engine with OPA WASM integration

This example shows how to:
1. Define a GDPR policy in Rego
2. Compile the policy to WASM
3. Evaluate data against the policy using the PolicyEvaluator
4. Understand policy decisions and reasons
"""

import os
import sys
import json
import tempfile
import subprocess
from pathlib import Path

# Add the policy-engine directory to the Python path
sys.path.append(str(Path(__file__).parent.parent / "services" / "policy-engine"))

try:
    from app.services.evaluator import PolicyEvaluator
except ImportError:
    print("Error: Could not import PolicyEvaluator. Make sure you're running this script from the Vagabond-Fuse root directory.")
    sys.exit(1)

# Define the GDPR policy in Rego
GDPR_POLICY = """
package gdpr

import future.keywords

# Default deny
default allow = false

# Allow if the user has consented to data processing
allow if {
    # Check if consent exists and is valid
    input.user.consent == true
    
    # Check if the purpose is specified
    input.purpose != null
    
    # Check if the purpose is allowed
    input.purpose in input.user.allowed_purposes
}

# Provide reasons for the decision
reasons contains "User has provided consent" if {
    input.user.consent == true
}

reasons contains "Purpose is specified" if {
    input.purpose != null
}

reasons contains "Purpose is allowed" if {
    input.purpose in input.user.allowed_purposes
}

reasons contains "User has not provided consent" if {
    input.user.consent != true
}

reasons contains "Purpose is not specified" if {
    input.purpose == null
}

reasons contains "Purpose is not allowed" if {
    input.purpose != null
    not input.purpose in input.user.allowed_purposes
}
"""

def compile_rego_to_wasm(rego_content, output_dir=None):
    """Compile a Rego policy to WASM"""
    if output_dir is None:
        output_dir = tempfile.mkdtemp()
    
    # Create a temporary Rego file
    with tempfile.NamedTemporaryFile(suffix=".rego", mode="w", delete=False) as f:
        rego_path = f.name
        f.write(rego_content)
    
    try:
        # Compile the allow rule - removed --disable-gzip flag
        allow_wasm_path = os.path.join(output_dir, "gdpr.wasm")
        subprocess.run(
            ["opa", "build", "-t", "wasm", "-e", "gdpr/allow", rego_path, "-o", allow_wasm_path],
            check=True,
            capture_output=True
        )
        
        # Compile the reasons rule - removed --disable-gzip flag
        reasons_wasm_path = os.path.join(output_dir, "gdpr_reasons.wasm")
        subprocess.run(
            ["opa", "build", "-t", "wasm", "-e", "gdpr/reasons", rego_path, "-o", reasons_wasm_path],
            check=True,
            capture_output=True
        )
        
        print(f"Successfully compiled Rego to WASM in {output_dir}")
        return output_dir
    except subprocess.CalledProcessError as e:
        print(f"Error compiling Rego to WASM: {e}")
        print(f"Stderr: {e.stderr.decode()}")
        return None
    finally:
        # Clean up the temporary Rego file
        os.unlink(rego_path)

def main():
    print("Policy Engine WASM Example")
    print("-------------------------")
    
    # 1. Compile the GDPR policy to WASM
    print("\n1. Compiling GDPR policy to WASM...")
    
    # Check if OPA is installed
    try:
        subprocess.run(["opa", "version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: OPA CLI is not installed or not in PATH.")
        print("Please install OPA from https://www.openpolicyagent.org/docs/latest/#1-download-opa")
        sys.exit(1)
    
    # Create a temporary directory for the WASM files
    wasm_dir = compile_rego_to_wasm(GDPR_POLICY)
    if not wasm_dir:
        print("Failed to compile Rego to WASM. Exiting.")
        sys.exit(1)
    
    # 2. Create a PolicyEvaluator
    print("\n2. Creating PolicyEvaluator with the compiled WASM...")
    evaluator = PolicyEvaluator(wasm_dir=Path(wasm_dir))
    
    # 3. Define test cases
    print("\n3. Defining test cases for GDPR policy evaluation...")
    test_cases = [
        {
            "name": "Valid consent and purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing"
            }
        },
        {
            "name": "No consent",
            "data": {
                "user": {
                    "consent": False,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing"
            }
        },
        {
            "name": "Missing purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": None
            }
        },
        {
            "name": "Disallowed purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "profiling"
            }
        }
    ]
    
    # 4. Evaluate each test case
    print("\n4. Evaluating test cases...")
    
    for test_case in test_cases:
        print(f"\nScenario: {test_case['name']}")
        result = evaluator.evaluate_credential(test_case["data"])
        
        print(f"Access allowed: {result['allow']}")
        print(f"Reasons: {', '.join(result['reasons'])}")
        
        # Explain the decision
        if result["allow"]:
            print("Explanation: The request is allowed because the user has provided consent, " +
                  "the purpose is specified, and the purpose is allowed.")
        else:
            if "User has not provided consent" in result["reasons"]:
                print("Explanation: The request is denied because the user has not provided consent.")
            elif "Purpose is not specified" in result["reasons"]:
                print("Explanation: The request is denied because the purpose is not specified.")
            elif "Purpose is not allowed" in result["reasons"]:
                print("Explanation: The request is denied because the purpose is not in the list of allowed purposes.")
    
    # 5. Clean up
    print("\n5. Cleaning up temporary files...")
    try:
        import shutil
        shutil.rmtree(wasm_dir)
        print(f"Removed temporary directory: {wasm_dir}")
    except Exception as e:
        print(f"Error cleaning up: {e}")
    
    print("\nExample completed successfully!")

if __name__ == "__main__":
    main() 