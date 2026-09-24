---
"@fluixi/oauth2": patch
---

A token request refused for want of a DPoP proof now says what that means. `invalid_dpop_proof` and `use_dpop_nonce` carry no meaning on their own, and Okta turns the requirement on by default for new applications, so it is met before anything is actually misconfigured. The message names RFC 9449, says the package does not implement it, and gives the two ways forward.
