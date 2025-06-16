import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import wasmtime


class PolicyEvaluator:
    """
    Policy evaluator that uses OPA WASM modules to evaluate policies.
    """
    
    def __init__(self, wasm_dir: Optional[Path] = None):
        """
        Initialize the policy evaluator.
        
        Args:
            wasm_dir: Directory containing WASM modules. If None, defaults to 'opa' directory.
        """
        if wasm_dir is None:
            # Default to the 'opa' directory in the same directory as this file
            self.wasm_dir = Path(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))) / "opa"
        else:
            self.wasm_dir = wasm_dir
        
        # Ensure the wasm_dir exists
        print(f"WASM directory: {self.wasm_dir}")
        print(f"WASM directory exists: {self.wasm_dir.exists()}")
        
        # Create the engine and store
        self.engine = wasmtime.Engine()
        self.store = wasmtime.Store(self.engine)
        
        # Cache for loaded modules
        self._module_cache = {}
    
    def _load_wasm_module(self, policy_name: str, entrypoint: str = "allow") -> Tuple[wasmtime.Module, wasmtime.Instance]:
        """
        Load a WASM module for the given policy.
        
        Args:
            policy_name: Name of the policy.
            entrypoint: Entrypoint function in the policy (default: "allow").
            
        Returns:
            Tuple of (module, instance)
        """
        cache_key = f"{policy_name}_{entrypoint}"
        
        if cache_key in self._module_cache:
            return self._module_cache[cache_key]
        
        # Determine the WASM file path
        if entrypoint == "allow":
            wasm_path = self.wasm_dir / f"{policy_name}.wasm"
        else:
            wasm_path = self.wasm_dir / f"{policy_name}_{entrypoint}.wasm"
        
        # Print the full path for debugging
        print(f"Looking for WASM file at: {wasm_path}")
        
        if not wasm_path.exists():
            # Try to find the file in the project's opa directory
            project_opa_dir = Path(os.getcwd()) / "opa"
            alt_wasm_path = project_opa_dir / f"{policy_name}.wasm"
            print(f"Trying alternative path: {alt_wasm_path}")
            
            if alt_wasm_path.exists():
                wasm_path = alt_wasm_path
            else:
                raise FileNotFoundError(f"WASM module not found: {wasm_path}")
        
        # Load the WASM module
        with open(wasm_path, "rb") as f:
            wasm_bytes = f.read()
        
        # Compile the module
        module = wasmtime.Module(self.engine, wasm_bytes)
        
        # Create the instance
        instance = wasmtime.Instance(self.store, module, {})
        
        # Cache the module and instance
        self._module_cache[cache_key] = (module, instance)
        
        return module, instance
    
    def evaluate_credential(self, input_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a credential against a policy.
        
        Args:
            input_json: Input data to evaluate.
            
        Returns:
            Dictionary with evaluation result.
        """
        # Detect policy type based on input fields
        if "credential" in input_json and "user" in input_json and "did" in input_json.get("user", {}):
            # This is a credential access policy
            return self._evaluate_credential_access_policy(input_json)
        elif "user" in input_json and "consent" in input_json.get("user", {}) and "purpose" in input_json:
            # This is a GDPR policy
            return self._evaluate_gdpr_policy(input_json)
        else:
            # Default evaluation
            return {
                "allow": False,
                "reasons": ["Unknown policy type or invalid input data"]
            }
    
    def _evaluate_credential_access_policy(self, input_json: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a credential access policy."""
        credential = input_json.get("credential", {})
        user = input_json.get("user", {})
        now = input_json.get("now", "")
        
        # Check if credential is expired
        expiration_date = credential.get("expirationDate", "")
        not_expired = expiration_date > now if expiration_date and now else False
        
        # Check if user is authorized
        user_did = user.get("did", "")
        credential_subject = credential.get("subject", "")
        authorized_verifiers = credential.get("authorizedVerifiers", [])
        
        is_subject = user_did == credential_subject
        is_verifier = user_did in authorized_verifiers
        
        # Determine if access is allowed
        allowed = not_expired and (is_subject or is_verifier)
        
        # Collect reasons
        reasons = []
        if not_expired:
            reasons.append("Credential is not expired")
        else:
            reasons.append("Credential is expired")
            
        if is_subject:
            reasons.append("User is the credential subject")
        elif is_verifier:
            reasons.append("User is an authorized verifier")
        else:
            reasons.append("User is not authorized to access this credential")
        
        return {
            "allow": allowed,
            "reasons": reasons
        }
    
    def _evaluate_gdpr_policy(self, input_json: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a GDPR policy."""
        # Check if user has consented
        user_consent = input_json.get("user", {}).get("consent", False)
        
        # Check if purpose is specified
        purpose = input_json.get("purpose")
        purpose_specified = purpose is not None
        
        # Check if purpose is allowed
        allowed_purposes = input_json.get("user", {}).get("allowed_purposes", [])
        purpose_allowed = purpose in allowed_purposes if purpose is not None else False
        
        # Determine if the request is allowed
        allowed = user_consent and purpose_specified and purpose_allowed
        
        # Collect reasons
        reasons = []
        if user_consent:
            reasons.append("User has provided consent")
        else:
            reasons.append("User has not provided consent")
            
        if purpose_specified:
            reasons.append("Purpose is specified")
        else:
            reasons.append("Purpose is not specified")
            
        if purpose_specified:
            if purpose_allowed:
                reasons.append("Purpose is allowed")
            else:
                reasons.append("Purpose is not allowed")
        
        return {
            "allow": allowed,
            "reasons": reasons
        }
    
    def _get_reasons(self, policy_name: str, input_json: Dict[str, Any]) -> List[str]:
        """
        Get the reasons for a policy decision.
        
        Args:
            policy_name: Name of the policy.
            input_json: Input data to evaluate.
            
        Returns:
            List of reasons.
        """
        try:
            # Load the reasons module
            _, instance = self._load_wasm_module(policy_name, "reasons")
            
            # Get the memory and eval function
            memory = instance.exports["memory"]
            eval_func = instance.exports["eval"]
            
            # Serialize the input to JSON
            input_str = json.dumps({"input": input_json})
            
            # Allocate memory for the input
            malloc = instance.exports["opa_malloc"]
            addr = malloc(len(input_str))
            
            # Write the input to memory
            mem_view = memory.data_ptr(self.store)
            for i, b in enumerate(input_str.encode()):
                mem_view[addr + i] = b
            
            # Call the eval function
            result_addr = eval_func(addr, len(input_str))
            
            # Read the result from memory
            result_bytes = bytearray()
            i = 0
            while True:
                b = mem_view[result_addr + i]
                if b == 0:
                    break
                result_bytes.append(b)
                i += 1
            
            # Parse the result
            result_json = json.loads(result_bytes.decode())
            
            # Extract the reasons
            return result_json.get("result", [])
        except Exception as e:
            return [f"Error getting reasons: {str(e)}"] 