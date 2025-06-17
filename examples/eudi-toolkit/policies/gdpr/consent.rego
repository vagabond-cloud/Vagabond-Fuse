package gdpr.consent

# GDPR Consent Policy
#
# This policy implements the consent requirements from GDPR Article 7:
# "Consent should be given by a clear affirmative act establishing a freely given,
# specific, informed and unambiguous indication of the data subject's agreement
# to the processing of personal data relating to him or her."

import future.keywords.in

# Default deny
default allow = false

# Default empty reasons
default reasons = []

# Allow if user has consented to the specific purpose
allow {
    # Check if user consent is provided
    input.user.consent == true
    
    # Check if purpose is specified
    input.purpose != null
    input.purpose != ""
    
    # Check if the purpose is in the list of allowed purposes
    input.purpose in input.user.allowed_purposes
    
    # Add reason
    reasons := ["User has consented to the specified purpose"]
}

# Collect reasons for the decision
reasons = all_reasons {
    # Start with empty set
    all_reasons := []
    
    # Add reason if user consent is missing
    all_reasons1 := array.concat(all_reasons, 
        [["User consent is not provided"]] {
            not input.user.consent == true
        }
    )
    
    # Add reason if purpose is missing
    all_reasons2 := array.concat(all_reasons1, 
        [["Purpose is not specified"]] {
            input.purpose == null
        }
    )
    
    # Add reason if purpose is not allowed
    all_reasons3 := array.concat(all_reasons2, 
        [[sprintf("User has not consented to purpose '%s'", [input.purpose])]] {
            input.purpose != null
            not input.purpose in input.user.allowed_purposes
        }
    )
    
    # Final set of reasons
    all_reasons := all_reasons3
}

# Check if consent is specific enough
is_consent_specific {
    # Consent is specific if the user has explicitly allowed the purpose
    input.purpose in input.user.allowed_purposes
}

# Check if consent is freely given
is_consent_freely_given {
    # For this simplified example, we assume consent is freely given if it exists
    input.user.consent == true
}

# Check if consent is informed
is_consent_informed {
    # For this simplified example, we assume consent is informed if the user has a record of when they were informed
    input.user.informed_timestamp != null
}

# Check if consent is unambiguous
is_consent_unambiguous {
    # For this simplified example, we assume consent is unambiguous if it's a boolean true value
    input.user.consent == true
} 