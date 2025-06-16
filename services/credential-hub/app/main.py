from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import json
import asyncio
import subprocess
from pathlib import Path
from contextlib import asynccontextmanager

from app.models import (
    Credential,
    CredentialRequest,
    CredentialResponse,
    ProofRequest,
    ProofResponse,
    VerificationRequest,
    VerificationResponse,
    StatusResponse,
    StatsResponse,
    # Policy models
    Policy,
    PolicyRequest,
    PolicyResponse,
    EvaluationRequest,
    EvaluationResponse,
    PolicyListResponse,
)
from app.services.credential_service import CredentialService
from app.services.proof_service import ProofService
from app.services.stats_service import StatsService
from app.services.policy_service import PolicyService

# Initialize services
credential_service = CredentialService()
proof_service = ProofService()
stats_service = StatsService()
policy_service = PolicyService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing to do
    yield
    # Shutdown: close connections
    await stats_service.close()

app = FastAPI(
    title="Credential Hub",
    description="FastAPI service for credential management with SnarkJS integration",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint"""
    return {"message": "Welcome to Credential Hub API"}


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "credential-hub"}


@app.post("/credentials/issue", response_model=CredentialResponse)
async def issue_credential(request: CredentialRequest) -> CredentialResponse:
    """Issue a new verifiable credential"""
    try:
        print(f"Issuing credential with subject_id: {request.subject_id}")
        credential = await credential_service.issue(
            subject_id=request.subject_id,
            issuer_id=request.issuer_id,
            claims=request.claims,
            proof_type=request.proof_type,
            expiration_date=request.expiration_date,
        )
        print(f"Credential issued with ID: {credential.id}")
        return CredentialResponse(
            credential_id=credential.id,
            credential=credential,
            message="Credential issued successfully",
        )
    except Exception as e:
        print(f"Error issuing credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to issue credential: {str(e)}",
        )


@app.post("/credentials/verify", response_model=VerificationResponse)
async def verify_credential(request: VerificationRequest) -> VerificationResponse:
    """Verify a credential"""
    try:
        verification_result = await credential_service.verify(
            credential_id=request.credential_id,
            credential=request.credential,
        )
        return VerificationResponse(
            is_valid=verification_result.is_valid,
            checks=verification_result.checks,
            errors=verification_result.errors,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify credential: {str(e)}",
        )


@app.post("/proofs/generate", response_model=ProofResponse)
async def generate_proof(request: ProofRequest) -> ProofResponse:
    """Generate a zero-knowledge proof"""
    try:
        proof = await proof_service.generate(
            credential_id=request.credential_id,
            reveal_attributes=request.reveal_attributes,
            circuit_id=request.circuit_id,
        )
        return ProofResponse(
            proof_id=proof.id,
            proof=proof.proof_value,
            public_inputs=proof.public_inputs,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate proof: {str(e)}",
        )


@app.post("/proofs/verify", response_model=VerificationResponse)
async def verify_proof(request: VerificationRequest) -> VerificationResponse:
    """Verify a zero-knowledge proof"""
    try:
        verification_result = await proof_service.verify(
            proof_id=request.proof_id,
            proof=request.proof,
            public_inputs=request.public_inputs,
            circuit_id=request.circuit_id,
        )
        return VerificationResponse(
            is_valid=verification_result.is_valid,
            checks=verification_result.checks,
            errors=verification_result.errors,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify proof: {str(e)}",
        )


@app.get("/credentials/{credential_id}/status", response_model=StatusResponse)
async def get_credential_status(credential_id: str) -> StatusResponse:
    """Get the status of a credential"""
    try:
        status = await credential_service.get_status(credential_id)
        return StatusResponse(
            credential_id=credential_id,
            status=status.status,
            reason=status.reason,
            timestamp=status.timestamp,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to get credential status: {str(e)}",
        )


@app.post("/credentials/{credential_id}/revoke")
async def revoke_credential(credential_id: str, reason: str = "Revoked by issuer") -> Dict[str, str]:
    """Revoke a credential"""
    try:
        await credential_service.revoke(credential_id, reason)
        return {"message": f"Credential {credential_id} revoked successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to revoke credential: {str(e)}",
        )


@app.get("/stats", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    """
    Get statistics about credentials
    
    Returns counts of issued, verified, and revoked credentials from the ClickHouse database.
    Falls back to default values if the database is unavailable.
    """
    try:
        stats = await stats_service.get_credential_stats()
        return StatsResponse(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve credential stats: {str(e)}",
        )


# Policy endpoints
@app.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(request: PolicyRequest) -> PolicyResponse:
    """Create a new policy"""
    try:
        policy = await policy_service.create(
            name=request.name,
            description=request.description,
            rules=request.rules,
            version=request.version,
            type=request.type,
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
            type=request.type,
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

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 