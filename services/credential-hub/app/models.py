from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
import uuid


class ProofType(str, Enum):
    JWT = "jwt"
    LD_PROOF = "ld_proof"
    ZKP = "zkp"


class CredentialStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    SUSPENDED = "suspended"
    EXPIRED = "expired"


class PolicyType(str, Enum):
    ACCESS_CONTROL = "access_control"
    DATA_VALIDATION = "data_validation"
    BUSINESS_RULE = "business_rule"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


class Credential(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context: List[str]
    type: List[str]
    issuer: str
    issuance_date: str
    expiration_date: Optional[str] = None
    credential_subject: Dict[str, Any]
    proof: Optional[Dict[str, Any]] = None
    status: Optional[Dict[str, str]] = None


class CredentialRequest(BaseModel):
    subject_id: str
    issuer_id: str
    claims: Dict[str, Any]
    proof_type: ProofType = ProofType.JWT
    expiration_date: Optional[str] = None


class CredentialResponse(BaseModel):
    credential_id: str
    credential: Credential
    message: str


class ProofRequest(BaseModel):
    credential_id: str
    reveal_attributes: List[str]
    circuit_id: Optional[str] = None
    challenge: Optional[str] = None


class Proof(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    credential_id: str
    proof_type: ProofType
    proof_value: Dict[str, Any]
    public_inputs: List[str]
    created_at: datetime = Field(default_factory=datetime.now)


class ProofResponse(BaseModel):
    proof_id: str
    proof: Dict[str, Any]
    public_inputs: List[str]


class VerificationCheck(BaseModel):
    check_type: str
    status: bool
    message: Optional[str] = None


class VerificationResult(BaseModel):
    is_valid: bool
    checks: List[VerificationCheck]
    errors: List[str] = []


class VerificationRequest(BaseModel):
    credential_id: Optional[str] = None
    credential: Optional[Credential] = None
    proof_id: Optional[str] = None
    proof: Optional[Dict[str, Any]] = None
    public_inputs: Optional[List[str]] = None
    circuit_id: Optional[str] = None


class VerificationResponse(BaseModel):
    is_valid: bool
    checks: List[VerificationCheck]
    errors: List[str] = []


class Status(BaseModel):
    credential_id: str
    status: CredentialStatus
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class StatusResponse(BaseModel):
    credential_id: str
    status: CredentialStatus
    reason: Optional[str] = None
    timestamp: datetime


class StatsResponse(BaseModel):
    issued: int
    verified: int
    revoked: int
    timestamp: datetime = Field(default_factory=datetime.now)


# Policy models
class Policy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rules: List[Dict[str, Any]]
    version: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    type: PolicyType = PolicyType.ACCESS_CONTROL
    metadata: Optional[Dict[str, Any]] = None
    wasm_module: Optional[bytes] = None


class PolicyRequest(BaseModel):
    name: str
    description: str
    rules: List[Dict[str, Any]]
    version: str = "1.0.0"
    type: PolicyType = PolicyType.ACCESS_CONTROL
    metadata: Optional[Dict[str, Any]] = None


class PolicyResponse(BaseModel):
    policy_id: str
    policy: Policy
    message: str


class PolicyListResponse(BaseModel):
    policies: List[Policy]
    count: int
    message: str


class EvaluationRequest(BaseModel):
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None


class EvaluationResult(BaseModel):
    allowed: bool
    reasons: List[str] = []
    errors: List[str] = []


class EvaluationResponse(BaseModel):
    policy_id: str
    allowed: bool
    reasons: List[str] = []
    errors: List[str] = [] 