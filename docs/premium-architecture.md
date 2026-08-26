# EthioCosmos Premium Foundation Architecture

**Status:** Manual/test foundation implemented; live payment checkout intentionally disabled.

**Scope:** This design adds Premium administration without changing the existing free learning experience. No real payment secret, merchant credential, webhook secret, price, refund policy, or tax decision is stored in source control, the browser bundle, or the Android package.

## Design decision

EthioCosmos uses a **global Premium kill switch**, a catalogue of feature flags, and time-bounded user entitlements. The global switch is evaluated before every Premium-only feature: when it is off, all Premium-only access is denied, including access belonging to a manually granted user. Existing entitlements are preserved, rather than deleted, so the owner can reactivate them by turning Premium mode back on.

Feature flags are deliberately conservative. The initial catalogue contains advanced AI tutoring, complete offline learning packs, the observatory simulation, advanced learning analytics, and Premium course paths. Each starts as free. The Admin can mark a feature Premium-only when the product experience and the feature’s server-side cost protection are ready. Existing core lessons, quizzes, community content, live streaming, and other current functionality are not silently paywalled.

The first operational mode is **manual/test mode**. A manual grant is written with `source = 'manual'`, an administrator actor, a start time, an optional expiry, and an internal note. The Admin can grant a fixed duration, set an exact expiry, grant without an expiry, update expiry, or revoke immediately. No manual grant represents a payment, and no user can create or modify one through the client.

## Data model

| Table | Purpose | Who can read it | Who can write it |
| --- | --- | --- | --- |
| `premium_settings` | Singleton global enable/disable switch and last update metadata | Public read of the non-sensitive switch | Active Admin only |
| `premium_features` | Feature catalogue and `is_premium` switch | Public read | Active Admin only |
| `premium_plans` | Draft plan name, duration, and ETB price | Public read of active plans; Admin can read all | Active Admin only |
| `premium_entitlements` | User access grants, status, source, dates, grant actor, and note | The owner of a row and Active Admins | Active Admin only |
| `premium_payments` | Future provider transaction ledger, including provider reference and verified state | Active Admin only | Active Admin only until a server-side webhook adapter is enabled |
| `premium_lessons` | Per-lesson Premium flags keyed to the stable lesson/subtopic route identifier | Public read of the non-sensitive flag; only Active Admins can write | Active Admin only |
| `premium_audit_log` | Append-only before/after records for Premium mutations | Active Admin only | Database trigger only |

The database uses row-level security and the existing `is_active_admin()` security-definer function. A user’s direct Supabase session can read only their own entitlement rows; it cannot insert, update, or delete entitlements. The access function accepts only a feature key and always evaluates `auth.uid()` internally, preventing a client from asking whether another user has Premium. Lesson-level flags are separately Admin-write-only, and the public lessons read policy filters full lesson rows through an ownership-safe current-user entitlement check whenever a lesson is marked Premium.

## Effective access algorithm

The effective decision for a feature is evaluated in this order:

1. If the feature key is unknown, deny access rather than guessing.
2. If the feature exists and `is_premium = false`, allow it as a free feature.
3. If the feature is Premium-only and the global switch is off, deny it.
4. If the feature is Premium-only and the global switch is on, require at least one entitlement for the current authenticated user with `status = 'active'`, `starts_at <= now()`, and either no expiry or `expires_at > now()`.
5. A revoked or expired entitlement never grants access. An administrator does not implicitly bypass Premium rules; an explicit entitlement is required if an Admin account is used for testing.
6. A lesson is free when it has no Premium flag or its flag is explicitly false. A marked lesson requires global Premium mode and an active entitlement. The lesson’s full database row is also protected by RLS, not only by a React conditional.

The current catalogue is mapped to real boundaries. `ai_tutor` protects the floating AI bubble, embedded lesson tutor, chat requests, voice transcription, and the server-side Groq calls. `observatory_simulation` protects the Solar System route before the Three.js scene initializes. `offline_learning_packs` protects the explicit offline-pack download action. `advanced_learning_analytics` protects the Progress page. `premium_courses` protects the Learning catalogue entry point when the Admin explicitly turns that feature on. Individual lessons are controlled separately from the feature switches in the Admin lesson section.

The browser context is useful for rendering status and hiding or showing UI, but it is not a security boundary. Any endpoint that consumes a paid or expensive capability must call the server-side Premium guard before doing work. The reusable Vercel helper calls the ownership-safe database function and fails closed if the lookup errors. The AI chat and voice endpoints authenticate the Supabase bearer token and reject the request before contacting Groq when `ai_tutor` is Premium-only. Offline content already downloaded to a device cannot be remotely recalled while the device is fully offline; once the device reconnects, the protected database read and future download checks apply. This is an unavoidable property of locally stored offline data and is kept explicit rather than hidden.

## Payment readiness and safety boundary

The application currently exposes a checkout-preflight endpoint only. It validates authentication and an active plan, then returns a clear `PAYMENT_PROVIDER_NOT_CONNECTED` response while the provider mode is `manual`. Even if environment variables are later added, the current adapter remains disabled until the provider’s official checkout and webhook behavior is reviewed and tested against the owner’s merchant account.

The future flow is intentionally server-side:

| Stage | Required behavior |
| --- | --- |
| Plan selection | Read an Admin-enabled plan from the database; never trust a browser-supplied amount or duration. |
| Checkout creation | Generate a unique merchant reference on the server and call the selected provider using a server-only secret. |
| User return | Treat a browser redirect as informational only; do not grant Premium from a redirect query string. |
| Webhook receipt | Verify the provider’s signature or secret mechanism, validate amount/currency/plan/reference, and process idempotently. |
| Transaction verification | Confirm final status server-to-server before granting access, especially for unusual or high-value states. |
| Entitlement grant | Insert a `source = 'payment'` entitlement only after verified payment, linked to the internal transaction record. |
| Refund or reversal | Mark the transaction accordingly and revoke or adjust access using a recorded Admin/system action. |

Chapa’s current webhook documentation describes payment success, failure, cancellation, refund, and other lifecycle events, and specifically recommends idempotent processing because the same webhook may be delivered more than once.[1] The documentation also describes merchant and Chapa references, ETB currency, event status, and merchant-defined metadata, which fit the planned `premium_payments` ledger and unique merchant-reference workflow.[1] ArifPay’s official developer portal describes developer-account creation, API-key configuration, a sandbox, checkout/direct-payment capabilities, and transaction verification using session and transaction identifiers.[2] These sources support keeping both providers behind an adapter rather than hard-coding one provider into the client.

## What is deliberately not enabled

The project does not claim that real money collection works today. There is no live checkout button, no provider secret, no webhook secret, no merchant account, and no invented test key. The draft plan price is `0` ETB and inactive, so the checkout-preflight endpoint rejects it as unconfigured. This prevents accidental collection or the false appearance of payment readiness.

When the owner is ready, the next information must be supplied through the deployment provider’s encrypted environment-variable settings, not chat, Git, the frontend bundle, or the APK. That information includes the selected provider, merchant/onboarding approval, official API version and checkout documentation, server-side secret key, webhook signing/verification mechanism, webhook URL configuration, confirmed currency and amount semantics, and the approved plan, refund, and support policy. Pricing, refunds, taxes, and any age-related account terms should be reviewed with a parent/guardian or trusted adult and the provider’s official Ethiopian documentation before activation.

## Implementation files

The database migrations are `supabase/premium_mode.sql`, `supabase/premium_audit.sql`, `supabase/premium_security.sql`, and `supabase/premium_lessons.sql`. The Admin interface is `src/components/PremiumAdminPanel.tsx` and is available as the `premium` tab inside `src/pages/AdminPage.tsx`, including individual lesson switches. The user-facing entitlement context is `src/context/PremiumContext.tsx`, with the shared access message in `src/components/PremiumRequiredMessage.tsx`. The mapped feature boundaries are in `src/components/AIChatBar.tsx`, `src/components/LessonTutor.tsx`, `src/components/AppUpdatePrompt.tsx`, `src/pages/LearningPage.tsx`, `src/pages/ProgressPage.tsx`, `src/pages/LessonPage.tsx`, and `src/pages/SolarSystemPage.tsx`. Server-side enforcement and disabled checkout preflight are in `api/_lib/premium.ts`, `api/groq/chat.ts`, `api/voice/transcribe.ts`, `api/premium/access.ts`, and `api/premium/checkout.ts`.

## References

[1]: https://docs.chapa.global/docs/v2/integrations/webhooks "Chapa V2 Webhooks"

[2]: https://developer.arifpay.net/ "ArifPay Developer Portal"
