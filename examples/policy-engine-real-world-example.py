#!/usr/bin/env python3
"""
Real-World Example: Using Policy Engine in a Social Network Application

This example demonstrates how to use the Policy Engine to implement:
1. Privacy-focused content sharing rules (GDPR compliant)
2. Age-appropriate content filtering
3. User permission management

Scenario: FuseStream social network application with Sparks (short text + video posts)
"""

import os
import sys
import json
import uuid
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add the policy-engine directory to the Python path
sys.path.append(str(Path(__file__).parent.parent / "services" / "policy-engine"))

try:
    from app.services.evaluator import PolicyEvaluator
except ImportError:
    print("Error: Could not import PolicyEvaluator. Make sure you're running this script from the CS-SIF root directory.")
    sys.exit(1)

# Define the GDPR content sharing policy in Rego
CONTENT_SHARING_POLICY = """
package content_sharing

import future.keywords

# Default deny
default allow = false

# Allow if all conditions are met
allow if {
    # Viewer has appropriate age for content
    input.viewer.age >= input.content.min_age
    
    # Content is public OR viewer has access
    public_or_has_access
    
    # Content creator has consented to sharing
    input.content.creator.sharing_consent == true
    
    # No privacy restrictions OR viewer is allowed
    no_privacy_restrictions_or_viewer_allowed
}

# Check if content is public or viewer has access
public_or_has_access if {
    input.content.visibility == "public"
}

public_or_has_access if {
    input.content.visibility == "followers"
    input.viewer.id in input.content.creator.followers
}

public_or_has_access if {
    input.content.visibility == "private"
    input.viewer.id in input.content.allowed_viewers
}

# Check privacy restrictions
no_privacy_restrictions_or_viewer_allowed if {
    not input.content.has_privacy_restrictions
}

no_privacy_restrictions_or_viewer_allowed if {
    input.content.has_privacy_restrictions
    input.viewer.location in input.content.allowed_regions
}

# Provide reasons for the decision
reasons contains "Age requirement satisfied" if {
    input.viewer.age >= input.content.min_age
}

reasons contains "Age requirement not satisfied" if {
    input.viewer.age < input.content.min_age
}

reasons contains "Content is public" if {
    input.content.visibility == "public"
}

reasons contains "Viewer is a follower" if {
    input.content.visibility == "followers"
    input.viewer.id in input.content.creator.followers
}

reasons contains "Viewer is explicitly allowed" if {
    input.content.visibility == "private"
    input.viewer.id in input.content.allowed_viewers
}

reasons contains "Content has no privacy restrictions" if {
    not input.content.has_privacy_restrictions
}

reasons contains "Viewer is in allowed region" if {
    input.content.has_privacy_restrictions
    input.viewer.location in input.content.allowed_regions
}

reasons contains "Creator has consented to sharing" if {
    input.content.creator.sharing_consent == true
}

reasons contains "Creator has not consented to sharing" if {
    input.content.creator.sharing_consent != true
}

reasons contains "Content is private and viewer not allowed" if {
    input.content.visibility == "private"
    not input.viewer.id in input.content.allowed_viewers
}

reasons contains "Content is for followers only and viewer is not a follower" if {
    input.content.visibility == "followers"
    not input.viewer.id in input.content.creator.followers
}

reasons contains "Viewer is not in an allowed region" if {
    input.content.has_privacy_restrictions
    not input.viewer.location in input.content.allowed_regions
}
"""

# Mock database for the example
class MockDatabase:
    def __init__(self):
        self.users = {}
        self.content = {}
        self.relationships = {}
        
    def create_user(self, user_id, name, age, location):
        self.users[user_id] = {
            "id": user_id,
            "name": name,
            "age": age,
            "location": location,
            "sharing_consent": True,
            "created_at": datetime.datetime.now().isoformat()
        }
        self.relationships[user_id] = {
            "followers": [],
            "following": []
        }
        return self.users[user_id]
    
    def create_content(self, content_id, creator_id, title, content_type, visibility, min_age=0):
        self.content[content_id] = {
            "id": content_id,
            "creator_id": creator_id,
            "title": title,
            "type": content_type,
            "visibility": visibility,
            "min_age": min_age,
            "has_privacy_restrictions": False,
            "allowed_regions": ["global"],
            "allowed_viewers": [],
            "created_at": datetime.datetime.now().isoformat()
        }
        return self.content[content_id]
    
    def follow_user(self, follower_id, followed_id):
        if follower_id in self.users and followed_id in self.users:
            self.relationships[followed_id]["followers"].append(follower_id)
            self.relationships[follower_id]["following"].append(followed_id)
            return True
        return False
    
    def set_content_privacy(self, content_id, has_restrictions, allowed_regions):
        if content_id in self.content:
            self.content[content_id]["has_privacy_restrictions"] = has_restrictions
            self.content[content_id]["allowed_regions"] = allowed_regions
            return True
        return False
    
    def allow_viewer(self, content_id, viewer_id):
        if content_id in self.content and viewer_id in self.users:
            self.content[content_id]["allowed_viewers"].append(viewer_id)
            return True
        return False

# FuseStream application that uses the policy engine
class FuseStreamApp:
    def __init__(self, policy_evaluator):
        self.db = MockDatabase()
        self.policy_evaluator = policy_evaluator
        
    def register_user(self, name, age, location):
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        return self.db.create_user(user_id, name, age, location)
    
    def create_spark(self, creator_id, title, content_type, visibility, min_age=0):
        content_id = f"spark_{uuid.uuid4().hex[:8]}"
        return self.db.create_content(content_id, creator_id, title, content_type, visibility, min_age)
    
    def follow_user(self, follower_id, followed_id):
        return self.db.follow_user(follower_id, followed_id)
    
    def set_spark_privacy(self, content_id, has_restrictions, allowed_regions):
        return self.db.set_content_privacy(content_id, has_restrictions, allowed_regions)
    
    def allow_viewer(self, content_id, viewer_id):
        return self.db.allow_viewer(content_id, viewer_id)
    
    def can_view_spark(self, viewer_id, content_id):
        """Check if a user can view a specific piece of content using the policy engine"""
        if viewer_id not in self.db.users or content_id not in self.db.content:
            return {"allowed": False, "reasons": ["User or content not found"]}
        
        viewer = self.db.users[viewer_id]
        content = self.db.content[content_id]
        creator = self.db.users[content["creator_id"]]
        
        # Prepare input for policy evaluation
        input_data = {
            "viewer": {
                "id": viewer_id,
                "age": viewer["age"],
                "location": viewer["location"]
            },
            "content": {
                "id": content_id,
                "min_age": content["min_age"],
                "visibility": content["visibility"],
                "has_privacy_restrictions": content["has_privacy_restrictions"],
                "allowed_regions": content["allowed_regions"],
                "allowed_viewers": content["allowed_viewers"],
                "creator": {
                    "id": creator["id"],
                    "sharing_consent": creator["sharing_consent"],
                    "followers": self.db.relationships[creator["id"]]["followers"]
                }
            }
        }
        
        # Evaluate against the policy
        result = self.policy_evaluator.evaluate_credential(input_data)
        return result

def main():
    print("FuseStream Social Network - Policy Engine Integration Example")
    print("----------------------------------------------------------")
    
    # Initialize the policy evaluator with the content sharing policy
    print("\n1. Initializing policy evaluator with content sharing policy...")
    
    # Create a temporary file for the Rego policy
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".rego", mode="w", delete=False) as f:
        rego_path = f.name
        f.write(CONTENT_SHARING_POLICY)
    
    # Compile the policy to WASM
    try:
        # Create a temporary directory for WASM files
        wasm_dir = tempfile.mkdtemp()
        
        # Compile the allow rule
        allow_wasm_path = os.path.join(wasm_dir, "content_sharing.wasm")
        os.system(f"opa build -t wasm -e content_sharing/allow {rego_path} -o {allow_wasm_path}")
        
        # Compile the reasons rule
        reasons_wasm_path = os.path.join(wasm_dir, "content_sharing_reasons.wasm")
        os.system(f"opa build -t wasm -e content_sharing/reasons {rego_path} -o {reasons_wasm_path}")
        
        # Initialize the policy evaluator
        evaluator = PolicyEvaluator(wasm_dir=Path(wasm_dir))
        
        # Initialize the FuseStream app
        app = FuseStreamApp(evaluator)
        
        print("Policy evaluator initialized successfully")
        
    except Exception as e:
        print(f"Error initializing policy evaluator: {e}")
        print("Using simulated policy evaluation for demonstration")
        
        # Create a simple evaluator that simulates the policy logic
        class SimulatedEvaluator:
            def evaluate_credential(self, data):
                viewer = data["viewer"]
                content = data["content"]
                
                allowed = True
                reasons = []
                
                # Check age requirement
                if viewer["age"] >= content["min_age"]:
                    reasons.append("Age requirement satisfied")
                else:
                    reasons.append("Age requirement not satisfied")
                    allowed = False
                
                # Check visibility
                if content["visibility"] == "public":
                    reasons.append("Content is public")
                elif content["visibility"] == "followers":
                    if viewer["id"] in content["creator"]["followers"]:
                        reasons.append("Viewer is a follower")
                    else:
                        reasons.append("Content is for followers only and viewer is not a follower")
                        allowed = False
                elif content["visibility"] == "private":
                    if viewer["id"] in content["allowed_viewers"]:
                        reasons.append("Viewer is explicitly allowed")
                    else:
                        reasons.append("Content is private and viewer not allowed")
                        allowed = False
                
                # Check creator consent
                if content["creator"]["sharing_consent"]:
                    reasons.append("Creator has consented to sharing")
                else:
                    reasons.append("Creator has not consented to sharing")
                    allowed = False
                
                # Check privacy restrictions
                if content["has_privacy_restrictions"]:
                    if viewer["location"] in content["allowed_regions"]:
                        reasons.append("Viewer is in allowed region")
                    else:
                        reasons.append("Viewer is not in an allowed region")
                        allowed = False
                else:
                    reasons.append("Content has no privacy restrictions")
                
                return {"allow": allowed, "reasons": reasons}
        
        evaluator = SimulatedEvaluator()
        app = FuseStreamApp(evaluator)
    
    # 2. Create users
    print("\n2. Creating users...")
    alice = app.register_user("Alice", 25, "EU")
    bob = app.register_user("Bob", 17, "US")
    charlie = app.register_user("Charlie", 30, "UK")
    diana = app.register_user("Diana", 22, "CA")
    
    print(f"Created users: {alice['name']}, {bob['name']}, {charlie['name']}, {diana['name']}")
    
    # 3. Create relationships
    print("\n3. Creating relationships...")
    app.follow_user(bob["id"], alice["id"])  # Bob follows Alice
    app.follow_user(charlie["id"], alice["id"])  # Charlie follows Alice
    app.follow_user(diana["id"], alice["id"])  # Diana follows Alice
    app.follow_user(alice["id"], charlie["id"])  # Alice follows Charlie
    
    print("Relationships created")
    
    # 4. Create content
    print("\n4. Creating content...")
    public_spark = app.create_spark(
        alice["id"], 
        "Public Spark", 
        "video", 
        "public"
    )
    
    followers_spark = app.create_spark(
        alice["id"], 
        "Followers Only Spark", 
        "video", 
        "followers"
    )
    
    private_spark = app.create_spark(
        alice["id"], 
        "Private Spark", 
        "video", 
        "private"
    )
    
    age_restricted_spark = app.create_spark(
        charlie["id"], 
        "Age Restricted Spark", 
        "video", 
        "public", 
        min_age=18
    )
    
    print("Content created")
    
    # 5. Set privacy settings
    print("\n5. Setting privacy settings...")
    app.set_spark_privacy(followers_spark["id"], True, ["EU", "UK"])
    app.allow_viewer(private_spark["id"], diana["id"])
    
    print("Privacy settings applied")
    
    # 6. Test access scenarios
    print("\n6. Testing access scenarios...")
    
    test_scenarios = [
        {
            "name": "Public content access",
            "viewer": bob["id"],
            "content": public_spark["id"],
            "expected": True
        },
        {
            "name": "Followers-only content access by follower",
            "viewer": bob["id"],
            "content": followers_spark["id"],
            "expected": True
        },
        {
            "name": "Followers-only content access by non-follower",
            "viewer": alice["id"],  # Alice doesn't follow herself
            "content": followers_spark["id"],
            "expected": False
        },
        {
            "name": "Private content access by allowed viewer",
            "viewer": diana["id"],
            "content": private_spark["id"],
            "expected": True
        },
        {
            "name": "Private content access by non-allowed viewer",
            "viewer": bob["id"],
            "content": private_spark["id"],
            "expected": False
        },
        {
            "name": "Age-restricted content access by adult",
            "viewer": charlie["id"],  # 30 years old
            "content": age_restricted_spark["id"],
            "expected": True
        },
        {
            "name": "Age-restricted content access by minor",
            "viewer": bob["id"],  # 17 years old
            "content": age_restricted_spark["id"],
            "expected": False
        },
        {
            "name": "Region-restricted content access from allowed region",
            "viewer": alice["id"],  # EU
            "content": followers_spark["id"],
            "expected": False  # Alice is not a follower of herself
        },
        {
            "name": "Region-restricted content access from non-allowed region",
            "viewer": diana["id"],  # CA
            "content": followers_spark["id"],
            "expected": False
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\nScenario: {scenario['name']}")
        result = app.can_view_spark(scenario["viewer"], scenario["content"])
        
        print(f"Access allowed: {result['allow']}")
        print(f"Reasons: {', '.join(result['reasons'])}")
        
        if result['allow'] == scenario['expected']:
            print("✅ Result matches expected outcome")
        else:
            print(f"❌ Result does not match expected outcome ({scenario['expected']})")
    
    # 7. Clean up
    print("\n7. Cleaning up temporary files...")
    try:
        import shutil
        os.unlink(rego_path)
        shutil.rmtree(wasm_dir)
        print("Temporary files removed")
    except Exception as e:
        print(f"Error cleaning up: {e}")
    
    print("\nExample completed successfully!")

if __name__ == "__main__":
    main() 