package gdpr

default allow = false

# Allow if user has given consent and data is used for the specified purpose
allow {
    input.user_consent == true
    input.purpose == "age-verification"
    input.data.age >= 18
}

# Provide a reason for the decision
reason = "Age verification passed" {
    allow
}

reason = "Age verification failed or consent not given" {
    not allow
}
