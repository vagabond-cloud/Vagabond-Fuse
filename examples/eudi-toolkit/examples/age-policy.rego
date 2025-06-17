package age_verification

default allow = false

allow {
  input.user_consent == true
  input.data.age >= 18
}
