from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
import uuid


class PolicyType(str, Enum):
    ACCESS_CONTROL = "access_control"
    DATA_VALIDATION = "data_validation"
    BUSINESS_RULE = "business_rule"
    COMPLIANCE = "compliance"
    CUSTOM = "custom"


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