import uuid
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from pathlib import Path

from app.models import (
    Policy,
    PolicyType,
    EvaluationResult,
)

# This service will forward requests to the policy-engine service
class PolicyService:
    def __init__(self, policy_engine_url: str = "http://localhost:8000"):
        self.policy_engine_url = policy_engine_url
        self.policies = {}  # In-memory store for demo purposes
    
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
        try:
            # Forward to policy-engine service if available
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.policy_engine_url}/policies",
                        json={
                            "name": name,
                            "description": description,
                            "rules": rules,
                            "version": version,
                            "type": type,
                            "metadata": metadata or {},
                        },
                        timeout=5.0,
                    )
                    if response.status_code == 201:
                        return Policy(**response.json()["policy"])
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation if policy-engine is not available
                pass
                
            # Local implementation
            policy_id = f"policy-{uuid.uuid4()}"
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
            self.policies[policy_id] = policy
            return policy
        except Exception as e:
            raise ValueError(f"Failed to create policy: {str(e)}")

    async def get(self, policy_id: str) -> Policy:
        """Get a policy by ID"""
        try:
            # Try to get from policy-engine service
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.policy_engine_url}/policies/{policy_id}",
                        timeout=5.0,
                    )
                    if response.status_code == 200:
                        return Policy(**response.json()["policy"])
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation
                pass
                
            # Local implementation
            if policy_id not in self.policies:
                raise ValueError(f"Policy {policy_id} not found")
            return self.policies[policy_id]
        except Exception as e:
            raise ValueError(f"Failed to get policy: {str(e)}")

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
        try:
            # Try to update in policy-engine service
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.put(
                        f"{self.policy_engine_url}/policies/{policy_id}",
                        json={
                            "name": name,
                            "description": description,
                            "rules": rules,
                            "version": version,
                            "type": type,
                            "metadata": metadata or {},
                        },
                        timeout=5.0,
                    )
                    if response.status_code == 200:
                        return Policy(**response.json()["policy"])
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation
                pass
                
            # Local implementation
            if policy_id not in self.policies:
                raise ValueError(f"Policy {policy_id} not found")
                
            policy = self.policies[policy_id]
            policy.name = name
            policy.description = description
            policy.rules = rules
            policy.version = version
            policy.type = type
            policy.metadata = metadata or {}
            policy.updated_at = datetime.now()
            
            self.policies[policy_id] = policy
            return policy
        except Exception as e:
            raise ValueError(f"Failed to update policy: {str(e)}")

    async def delete(self, policy_id: str) -> None:
        """Delete a policy"""
        try:
            # Try to delete from policy-engine service
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.delete(
                        f"{self.policy_engine_url}/policies/{policy_id}",
                        timeout=5.0,
                    )
                    if response.status_code == 200:
                        return
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation
                pass
                
            # Local implementation
            if policy_id not in self.policies:
                raise ValueError(f"Policy {policy_id} not found")
            del self.policies[policy_id]
        except Exception as e:
            raise ValueError(f"Failed to delete policy: {str(e)}")

    async def list(self) -> List[Policy]:
        """List all policies"""
        try:
            # Try to get from policy-engine service
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.policy_engine_url}/policies",
                        timeout=5.0,
                    )
                    if response.status_code == 200:
                        return [Policy(**p) for p in response.json()["policies"]]
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation
                pass
                
            # Local implementation
            return list(self.policies.values())
        except Exception as e:
            raise ValueError(f"Failed to list policies: {str(e)}")

    async def evaluate(
        self,
        policy_id: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> EvaluationResult:
        """Evaluate a policy against input data"""
        try:
            # Try to evaluate using policy-engine service
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.policy_engine_url}/policies/{policy_id}/evaluate",
                        json={
                            "input_data": input_data,
                            "context": context or {},
                        },
                        timeout=5.0,
                    )
                    if response.status_code == 200:
                        result = response.json()
                        return EvaluationResult(
                            allowed=result["allowed"],
                            reasons=result["reasons"],
                            errors=result["errors"],
                        )
            except (httpx.ConnectError, httpx.ReadTimeout):
                # Fall back to local implementation
                pass
                
            # Local implementation - simplified evaluation
            if policy_id not in self.policies:
                raise ValueError(f"Policy {policy_id} not found")
                
            # Simple rule evaluation (just a placeholder)
            # In a real implementation, you'd use a proper policy evaluation engine
            return EvaluationResult(
                allowed=True,  # Default to allowed in local implementation
                reasons=["Local evaluation: No policy engine available"],
                errors=[],
            )
        except Exception as e:
            raise ValueError(f"Failed to evaluate policy: {str(e)}") 