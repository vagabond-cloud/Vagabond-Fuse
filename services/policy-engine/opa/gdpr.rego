package gdpr

import future.keywords

# Default deny
default allow = false

# Allow if the user has consented to data processing
allow if {
    # Check if consent exists and is valid
    input.user.consent == true
    
    # Check if the purpose is specified
    input.purpose != null
    
    # Check if the purpose is allowed
    input.purpose in input.user.allowed_purposes
}

# Provide reasons for the decision
reasons contains "User has provided consent" if {
    input.user.consent == true
}

reasons contains "Purpose is specified" if {
    input.purpose != null
}

reasons contains "Purpose is allowed" if {
    input.purpose in input.user.allowed_purposes
}

reasons contains "User has not provided consent" if {
    input.user.consent != true
}

reasons contains "Purpose is not specified" if {
    input.purpose == null
}

reasons contains "Purpose is not allowed" if {
    input.purpose != null
    not input.purpose in input.user.allowed_purposes
} 