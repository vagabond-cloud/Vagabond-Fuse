from typing import Dict, List, Optional, Any
import json
import uuid
from datetime import datetime
import asyncio
from pathlib import Path
import tempfile
import os
import subprocess

from app.models import (
    Policy,
    PolicyType,
    EvaluationResult,
)
from app.services.evaluator import PolicyEvaluator


class PolicyService:
    def __init__(self):
        # In a real implementation, these would be stored in a database
        self._policies: Dict[str, Policy] = {}
        
        # Create a directory for storing WASM modules
        self._wasm_dir = Path(tempfile.gettempdir()) / "policy_engine_wasm"
        self._wasm_dir.mkdir(exist_ok=True, parents=True)
        
        # Initialize the policy evaluator
        self._evaluator = PolicyEvaluator(wasm_dir=self._wasm_dir)

    async def create(
        self,
        name: str,
        description: str,
        rules: List[Dict[str, Any]],
        version: str = "1.0.0",
        type: PolicyType = PolicyType.ACCESS_CONTROL,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Policy:
        """Create a new policy"""
        policy_id = str(uuid.uuid4())
        
        # Create policy
        policy = Policy(
            id=policy_id,
            name=name,
            description=description,
            rules=rules,
            version=version,
            type=type,
            metadata=metadata or {},
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        # Compile rules to WASM
        try:
            wasm_module = await self._compile_rules_to_wasm(rules)
            policy.wasm_module = wasm_module
        except Exception as e:
            # In a real implementation, we would log this error
            print(f"Failed to compile rules to WASM: {e}")
            # For now, we'll still store the policy without WASM
        
        # Store the policy
        self._policies[policy_id] = policy
        
        return policy

    async def get(self, policy_id: str) -> Policy:
        """Get a policy by ID"""
        policy = self._policies.get(policy_id)
        if not policy:
            raise ValueError(f"Policy {policy_id} not found")
        return policy

    async def update(
        self,
        policy_id: str,
        name: str,
        description: str,
        rules: List[Dict[str, Any]],
        version: str,
        type: PolicyType = PolicyType.ACCESS_CONTROL,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Policy:
        """Update a policy"""
        if policy_id not in self._policies:
            raise ValueError(f"Policy {policy_id} not found")
        
        policy = self._policies[policy_id]
        
        # Update policy
        policy.name = name
        policy.description = description
        policy.rules = rules
        policy.version = version
        policy.type = type
        policy.metadata = metadata or {}
        policy.updated_at = datetime.now()
        
        # Recompile rules to WASM
        try:
            wasm_module = await self._compile_rules_to_wasm(rules)
            policy.wasm_module = wasm_module
        except Exception as e:
            # In a real implementation, we would log this error
            print(f"Failed to compile rules to WASM: {e}")
        
        # Store the updated policy
        self._policies[policy_id] = policy
        
        return policy

    async def delete(self, policy_id: str) -> None:
        """Delete a policy"""
        if policy_id not in self._policies:
            raise ValueError(f"Policy {policy_id} not found")
        
        del self._policies[policy_id]

    async def list(self) -> List[Policy]:
        """List all policies"""
        return list(self._policies.values())

    async def evaluate(
        self,
        policy_id: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """Evaluate a policy against input data"""
        policy = await self.get(policy_id)
        
        # If we have a WASM module, use it
        if policy.wasm_module:
            try:
                return await self._evaluate_wasm(policy.wasm_module, input_data, context)
            except Exception as e:
                # In a real implementation, we would log this error
                print(f"Failed to evaluate WASM: {e}")
                # Fall back to direct evaluation
        
        # Direct evaluation using the rules
        return await self._evaluate_rules(policy.rules, input_data, context)

    async def _compile_rules_to_wasm(self, rules: List[Dict[str, Any]]) -> bytes:
        """Compile rules to WASM"""
        # In a real implementation, we would:
        # 1. Convert rules to Rego
        # 2. Compile Rego to WASM using OPA
        
        # For this scaffolding, we'll return a placeholder WASM module
        # In a real implementation, we would use the OPA CLI to compile the rules
        
        # Create a temporary Rego file
        with tempfile.NamedTemporaryFile(suffix=".rego", mode="w", delete=False) as f:
            rego_path = f.name
            f.write("""
package policy

default allow = false

allow if {
    input.value > 0
}
""")
        
        try:
            # In a real implementation, we would call the OPA CLI to compile the Rego file
            # For now, we'll return a placeholder WASM module
            
            # This is a placeholder for the actual OPA compilation
            process = await asyncio.create_subprocess_exec(
                "opa", "build", "-t", "wasm", "-e", "policy/allow", rego_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                raise RuntimeError(f"OPA compilation failed: {stderr.decode()}")
            
            # Read the compiled WASM module
            wasm_path = Path(rego_path).with_suffix(".wasm")
            if wasm_path.exists():
                return wasm_path.read_bytes()
            
            # For now, return a placeholder WASM module
            return b"\0asm\1\0\0\0"
        finally:
            # Clean up the temporary file
            os.unlink(rego_path)

    async def _evaluate_wasm(
        self,
        wasm_module: bytes,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """Evaluate a WASM module against input data"""
        # Save the WASM module to a temporary file
        wasm_path = self._wasm_dir / f"{uuid.uuid4()}.wasm"
        wasm_path.write_bytes(wasm_module)
        
        try:
            # Use the PolicyEvaluator to evaluate the input
            # Note: In a real implementation, we would use the actual policy name
            # For now, we'll use a temporary evaluator with the temporary WASM file
            temp_evaluator = PolicyEvaluator(wasm_dir=self._wasm_dir)
            result = temp_evaluator.evaluate_credential(input_data)
            
            return EvaluationResult(
                allowed=result["allow"],
                reasons=result["reasons"],
                errors=[],
            )
        except Exception as e:
            return EvaluationResult(
                allowed=False,
                reasons=[],
                errors=[f"WASM evaluation failed: {str(e)}"],
            )
        finally:
            # Clean up the temporary file
            if wasm_path.exists():
                wasm_path.unlink()

    async def _evaluate_rules(
        self,
        rules: List[Dict[str, Any]],
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """Evaluate rules directly against input data"""
        # Use the PolicyEvaluator to evaluate the input directly
        try:
            result = self._evaluator.evaluate_credential(input_data)
            
            return EvaluationResult(
                allowed=result["allow"],
                reasons=result["reasons"],
                errors=[],
            )
        except Exception as e:
            return EvaluationResult(
                allowed=False,
                reasons=["Direct rule evaluation failed"],
                errors=[str(e)],
            ) 