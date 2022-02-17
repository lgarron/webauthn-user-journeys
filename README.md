# WebAuthn User Journeys

This repo offers ways to test several user journeys, specifically for RPs:

- that have users with existing security key registrations, and
- are implementing support for UVPA [trusted devices](https://w3c.github.io/webauthn/#sctn-authenticator-attachment-modality) (possibly soon to be renamed to "passkeys"?).

This means there are two "registration levels":

- "Security key" registrations. These may or may not be tied to a UVPA, and the RP in general does not have a way to get information about UV or PA status (unless they get a UV bit in a `get` response).
  - Note that browsers can prevent such registrations by setting `"authenticator-selection": "cross-platform"`. However, some RPs (like `github.com`) still need to handle _existing_ registrations from years ago.
- "Trusted device" registrations, known to be backed by a UVPA.
  - These may be discoverable credentials (and often will be), but the RP does not necessarily know that (depending on tradeoffs due to the spec/browsers).
