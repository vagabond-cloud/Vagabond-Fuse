from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import json
from pathlib import Path

from app.models import (
    Policy,
    PolicyRequest,
    PolicyResponse,
    EvaluationRequest,
    EvaluationResponse,
    PolicyListResponse,
)
from app.services.policy_service import PolicyService

app = FastAPI(
    title="Policy Engine",
    description="FastAPI service for policy execution with OPA WASM",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
policy_service = PolicyService()


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint"""
    return {"message": "Welcome to Policy Engine API"}


@app.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(request: PolicyRequest) -> PolicyResponse:
    """Create a new policy"""
    try:
        policy = await policy_service.create(
            name=request.name,
            description=request.description,
            rules=request.rules,
            version=request.version,
            metadata=request.metadata,
        )
        return PolicyResponse(
            policy_id=policy.id,
            policy=policy,
            message="Policy created successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create policy: {str(e)}",
        )


@app.get("/policies/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: str) -> PolicyResponse:
    """Get a policy by ID"""
    try:
        policy = await policy_service.get(policy_id)
        return PolicyResponse(
            policy_id=policy.id,
            policy=policy,
            message="Policy retrieved successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to get policy: {str(e)}",
        )


@app.post("/policies/{policy_id}/evaluate", response_model=EvaluationResponse)
async def evaluate_policy(policy_id: str, request: EvaluationRequest) -> EvaluationResponse:
    """Evaluate a policy against input data"""
    try:
        result = await policy_service.evaluate(
            policy_id=policy_id,
            input_data=request.input_data,
            context=request.context,
        )
        return EvaluationResponse(
            policy_id=policy_id,
            allowed=result.allowed,
            reasons=result.reasons,
            errors=result.errors,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to evaluate policy: {str(e)}",
        )


@app.put("/policies/{policy_id}", response_model=PolicyResponse)
async def update_policy(policy_id: str, request: PolicyRequest) -> PolicyResponse:
    """Update a policy"""
    try:
        policy = await policy_service.update(
            policy_id=policy_id,
            name=request.name,
            description=request.description,
            rules=request.rules,
            version=request.version,
            metadata=request.metadata,
        )
        return PolicyResponse(
            policy_id=policy.id,
            policy=policy,
            message="Policy updated successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update policy: {str(e)}",
        )


@app.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str) -> Dict[str, str]:
    """Delete a policy"""
    try:
        await policy_service.delete(policy_id)
        return {"message": f"Policy {policy_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to delete policy: {str(e)}",
        )


@app.get("/policies", response_model=PolicyListResponse)
async def list_policies() -> PolicyListResponse:
    """List all policies"""
    try:
        policies = await policy_service.list()
        return PolicyListResponse(
            policies=policies,
            count=len(policies),
            message="Policies retrieved successfully",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list policies: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True) 