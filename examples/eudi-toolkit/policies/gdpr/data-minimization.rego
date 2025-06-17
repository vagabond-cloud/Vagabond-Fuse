package gdpr.data_minimization

# GDPR Data Minimization Policy
#
# This policy implements the data minimization principle from GDPR Article 5(1)(c):
# "Personal data shall be adequate, relevant and limited to what is necessary
# in relation to the purposes for which they are processed."

import future.keywords.in

# Default deny
default allow = false

# Default empty reasons
default reasons = []

# Define allowed purposes and their required attributes
allowed_purpose_attributes = {
    "identity_verification": ["firstName", "lastName", "dateOfBirth"],
    "age_verification": ["dateOfBirth"],
    "address_verification": ["address"],
    "license_verification": ["licenseNumber", "categories", "expiryDate"],
    "full_verification": ["firstName", "lastName", "dateOfBirth", "licenseNumber", "categories", "expiryDate", "issuingAuthority"]
}

# Allow if the purpose is valid and only required attributes are requested
allow {
    # Check if the purpose is specified
    input.purpose != null
    input.purpose != ""
    
    # Check if the purpose is allowed
    input.purpose in object.keys(allowed_purpose_attributes)
    
    # Check if the requested attributes are valid for the purpose
    required_attributes := allowed_purpose_attributes[input.purpose]
    requested_attributes := object.keys(input.requested_attributes)
    
    # All requested attributes must be in the list of required attributes for the purpose
    count({attr | attr := requested_attributes[_]; not attr in required_attributes}) == 0
    
    # Add reason
    reasons := ["Requested attributes are valid for the specified purpose"]
}

# Collect reasons for the decision
reasons = all_reasons {
    # Start with empty set
    all_reasons := []
    
    # Add reason if purpose is missing
    all_reasons1 := array.concat(all_reasons, 
        [["Purpose is not specified"]] {
            input.purpose == null
        }
    )
    
    # Add reason if purpose is not allowed
    all_reasons2 := array.concat(all_reasons1, 
        [["Purpose is not allowed"]] {
            input.purpose != null
            not input.purpose in object.keys(allowed_purpose_attributes)
        }
    )
    
    # Add reasons for invalid attributes
    requested_attributes := object.keys(input.requested_attributes)
    required_attributes := allowed_purpose_attributes[input.purpose]
    
    invalid_attributes := {attr | 
        attr := requested_attributes[_]
        not attr in required_attributes
    }
    
    all_reasons3 := array.concat(all_reasons2, 
        [[sprintf("Attribute '%s' is not required for purpose '%s'", [attr, input.purpose])] |
            attr := invalid_attributes[_]
        ]
    )
    
    # Final set of reasons
    all_reasons := all_reasons3
} 