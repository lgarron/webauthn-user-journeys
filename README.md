# WebAuthn User Journeys

This repo offers ways to test several user journeys, specifically for RPs:

- implementing support for UVPA [trusted devices](https://w3c.github.io/webauthn/#sctn-authenticator-attachment-modality) (possibly soon to be renamed to "passkeys"),
- that have existing security key registrations.

This means there are two kinds of registrations:

- "Security key" registrations. These may or may not be tied to a UVPA, and the RP in general does not have a way to get information about UV or PA status (unless they get a UV bit in a `get` response).
  - Note that browsers can prevent such registrations by setting `"authenticator-selection": "cross-platform"`. However, the RP still needs to handle _existing_ registrations from years ago.
- "Trusted device" registrations, known to be backed by a UVPA.
  - These may be discoverable credentials (and often will be), but the RP has no way of knowing that, unless they prompt the user with empty `allowCredentials()`.
