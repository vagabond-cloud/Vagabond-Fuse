from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Dict, List, Optional, Any
import logging
from contextlib import asynccontextmanager
from datetime import datetime

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
    WalletChallengeRequest,
    WalletChallengeResponse,
    WalletVerifyRequest,
    AuthTokenResponse,
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
from app.services.auth_service import AuthService
from app.services.anchor_service import AnchorService
from app.database import init_database, close_database
from app.config import get_settings

# Initialize logger
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Initialize services
credential_service = CredentialService()
stats_service = StatsService()
policy_service = PolicyService()
auth_service = AuthService()
anchor_service = AnchorService()

# Initialize proof service with production settings
proof_service = ProofService(
    circuits_dir=settings.circuits_dir,
    node_path=settings.node_path,
    postgres_dsn=settings.postgres_dsn,
    redis_url=settings.redis_url,
    max_pool_size=settings.database_pool_size,
    proof_cache_ttl=settings.proof_cache_ttl,
    rate_limit_per_minute=settings.rate_limit_per_minute
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and proof service
    await init_database()
    await proof_service.initialize()
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown: close connections
    await proof_service.close()
    await stats_service.close()
    await close_database()
    logger.info("Application shutdown complete")

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

auth_scheme = HTTPBearer(auto_error=False)


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    try:
        return auth_service.verify_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint"""
    return {"message": "Welcome to Credential Hub API"}


@app.post("/auth/challenge", response_model=WalletChallengeResponse)
async def create_auth_challenge(
    request: WalletChallengeRequest,
) -> WalletChallengeResponse:
    """Create a wallet signature challenge."""
    try:
        return auth_service.create_challenge(request.wallet_address, request.chain)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create challenge: {str(e)}",
        )


@app.post("/auth/verify", response_model=AuthTokenResponse)
async def verify_auth_challenge(request: WalletVerifyRequest) -> AuthTokenResponse:
    """Verify wallet signature and return access token."""
    try:
        return auth_service.verify_challenge_and_issue_token(
            challenge_id=request.challenge_id,
            wallet_address=request.wallet_address,
            chain=request.chain,
            signature=request.signature,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


@app.post("/credentials/issue", response_model=CredentialResponse)
async def issue_credential(
    request: CredentialRequest,
    auth_claims: Dict[str, Any] = Depends(require_auth),
) -> CredentialResponse:
    """Issue a new verifiable credential"""
    try:
        logger.info("Issuing credential for subject_id=%s", request.subject_id)
        credential = await credential_service.issue(
            subject_id=request.subject_id,
            issuer_id=request.issuer_id,
            claims=request.claims,
            proof_type=request.proof_type,
            expiration_date=request.expiration_date,
        )
        anchor = await anchor_service.anchor_payload(
            entity_type="credential",
            entity_id=credential.id,
            payload=credential.model_dump(mode="json"),
            wallet_did=auth_claims.get("sub"),
        )
        await credential_service.set_credential_anchor(credential.id, anchor)
        credential.anchor = anchor
        logger.info("Issued credential_id=%s", credential.id)
        return CredentialResponse(
            credential_id=credential.id,
            credential=credential,
            message="Credential issued successfully",
        )
    except Exception as e:
        logger.exception("Error issuing credential")
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
async def generate_proof(
    request: ProofRequest,
    auth_claims: Dict[str, Any] = Depends(require_auth),
) -> ProofResponse:
    """Generate a zero-knowledge proof"""
    try:
        proof = await proof_service.generate(
            credential_id=request.credential_id,
            reveal_attributes=request.reveal_attributes,
            circuit_id=request.circuit_id,
        )
        anchor = await anchor_service.anchor_payload(
            entity_type="proof",
            entity_id=proof.id,
            payload=proof.model_dump(mode="json"),
            wallet_did=auth_claims.get("sub"),
        )
        await proof_service.set_proof_anchor(proof.id, anchor)
        proof.anchor = anchor
        return ProofResponse(
            proof_id=proof.id,
            proof=proof.proof_value,
            public_inputs=proof.public_inputs,
            anchor=anchor,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate proof: {str(e)}",
        )


@app.post("/proofs/verify", response_model=VerificationResponse)
async def verify_proof(
    request: VerificationRequest,
    _auth_claims: Dict[str, Any] = Depends(require_auth),
) -> VerificationResponse:
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
async def revoke_credential(
    credential_id: str,
    reason: str = "Revoked by issuer",
    _auth_claims: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, str]:
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


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers
    """
    try:
        from app.database import get_db_manager
        from app.monitoring import init_monitoring
        
        db_manager = get_db_manager()
        _, _, health_checker = init_monitoring(db_manager, proof_service)
        
        if health_checker:
            health_status = await health_checker.check_health()
            
            if health_status['status'] == 'healthy':
                return health_status
            elif health_status['status'] == 'degraded':
                return JSONResponse(
                    status_code=200,
                    content=health_status
                )
            else:
                return JSONResponse(
                    status_code=503,
                    content=health_status
                )
        else:
            return {"status": "healthy", "message": "Basic health check passed"}
            
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


@app.get("/metrics/proofs")
async def get_proof_metrics():
    """
    Get proof service performance metrics
    """
    try:
        stats = await proof_service.get_proof_statistics()
        return {
            "proof_statistics": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve proof metrics: {str(e)}"
        )


@app.get("/circuits")
async def list_available_circuits():
    """
    List all available circuits and their status
    """
    try:
        circuits = await proof_service.list_circuits()
        return {
            "circuits": circuits,
            "count": len(circuits),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list circuits: {str(e)}"
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
