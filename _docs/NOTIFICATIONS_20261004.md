# Notification navigation — 2026-10-04

- Order notifications link to the accessible order, reset filters and select active/cancelled tab.
- Chat/progress notices open the order conversation. Support notices without order metadata open an owner-scoped support response inbox.
- Legacy notices without a destination open dashboard; no invented order identity.
- Native links support keyboard/new tab. Read updates scoped to authenticated actor; failed read update does not block navigation.
- Local notification/auth tests and static checks run before release. Production authenticated click flow not verified: browser has no valid user session. Staging role/order matrix remains waived / not verified.
