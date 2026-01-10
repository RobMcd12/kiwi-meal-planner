# Kiwi Meal Planner - Security & Compliance Documentation

**Document Version:** 1.0
**Last Updated:** January 2026
**Classification:** Internal / Customer-Facing
**Owner:** Unicloud Limited

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Authentication & Access Control](#3-authentication--access-control)
4. [Data Protection & Privacy](#4-data-protection--privacy)
5. [API & Network Security](#5-api--network-security)
6. [Payment Security (PCI DSS)](#6-payment-security-pci-dss)
7. [Infrastructure Security](#7-infrastructure-security)
8. [Regulatory Compliance](#8-regulatory-compliance)
9. [Incident Response](#9-incident-response)
10. [Security Controls Matrix](#10-security-controls-matrix)
11. [Audit Log](#11-audit-log)
12. [Contact Information](#12-contact-information)

---

## 1. Executive Summary

### 1.1 Purpose

This document provides a comprehensive overview of the security measures, data protection practices, and regulatory compliance status of the Kiwi Meal Planner application. It serves as both an internal reference and a customer-facing assurance document.

### 1.2 Scope

This document covers:
- Web application (kiwimealplanner.co.nz)
- Progressive Web App (PWA)
- Backend services (Supabase)
- Edge Functions (Deno runtime)
- Third-party integrations (Stripe, Google AI)

### 1.3 Security Posture Summary

| Category | Status | Last Audit |
|----------|--------|------------|
| Authentication | ✅ Strong | January 2026 |
| Authorization (RLS) | ✅ Comprehensive | January 2026 |
| Data Encryption | ✅ In-transit & At-rest | January 2026 |
| API Security | ✅ Protected | January 2026 |
| Payment Security | ✅ PCI DSS Compliant (via Stripe) | January 2026 |
| Privacy Compliance | ✅ NZ Privacy Act 2020 | January 2026 |

---

## 2. System Architecture Overview

### 2.1 Technology Stack

| Layer | Technology | Security Features |
|-------|------------|-------------------|
| Frontend | React 19, TypeScript, Vite | CSP headers, XSS protection |
| Backend | Supabase (PostgreSQL) | RLS, encrypted connections |
| Authentication | Supabase Auth | PKCE OAuth, JWT tokens |
| Serverless | Deno Edge Functions | Sandboxed execution |
| Payments | Stripe | PCI DSS Level 1 |
| AI Services | Google Gemini | Server-side only |
| Hosting | Railway | TLS 1.3, DDoS protection |

### 2.2 Data Flow Diagram

```
┌─────────────────┐     HTTPS/TLS 1.3      ┌──────────────────┐
│   User Browser  │◄─────────────────────►│  Railway (CDN)   │
│   (React PWA)   │                        │  kiwimealplanner │
└────────┬────────┘                        └────────┬─────────┘
         │                                          │
         │  JWT Token                               │
         ▼                                          ▼
┌─────────────────┐                        ┌──────────────────┐
│  Supabase Auth  │◄──────────────────────►│  Edge Functions  │
│  (PKCE OAuth)   │                        │  (Deno Runtime)  │
└────────┬────────┘                        └────────┬─────────┘
         │                                          │
         │  Row Level Security                      │ API Keys
         ▼                                          ▼
┌─────────────────┐                        ┌──────────────────┐
│   PostgreSQL    │                        │  External APIs   │
│  (Encrypted)    │                        │  Stripe, Gemini  │
└─────────────────┘                        └──────────────────┘
```

### 2.3 Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | kiwimealplanner.co.nz | Live user traffic |
| Staging | kiwi-meal-planner-production.up.railway.app | Pre-release testing |
| Development | localhost:3000 | Local development |

---

## 3. Authentication & Access Control

### 3.1 Authentication Methods

| Method | Implementation | Security Level |
|--------|---------------|----------------|
| Email/Password | Supabase Auth | Standard |
| Google OAuth | PKCE flow | High |
| Apple OAuth | PKCE flow | High |
| GitHub OAuth | PKCE flow | High |

### 3.2 Session Management

- **Token Type:** JWT (JSON Web Tokens)
- **Token Storage:** HTTP-only cookies (Supabase managed)
- **Session Duration:** Configurable, auto-refresh enabled
- **PKCE Flow:** Enabled for all OAuth providers (more secure than implicit flow)

**Implementation Reference:** `services/authService.ts`
```typescript
auth: {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce',  // Proof Key for Code Exchange
}
```

### 3.3 Role-Based Access Control (RBAC)

| Role | Permissions | Verification Method |
|------|-------------|---------------------|
| User | Own data only | RLS policies |
| Admin | View all users, manage settings | `is_admin` database flag |
| Super Admin | Full system access | Server-side secret verification |

### 3.4 Admin Impersonation Controls

Administrators can impersonate users for support purposes with the following safeguards:

1. **Cannot impersonate self** - Prevents accidental data modification
2. **Cannot impersonate other admins** - Prevents privilege escalation
3. **Session-only storage** - Impersonation state cleared on logout
4. **Full audit logging** - All impersonation actions recorded

**Implementation Reference:** `components/AuthProvider.tsx:116-150`

### 3.5 Super Admin Protection

Super admin identification is protected via server-side verification:

- Email stored in Supabase secrets (`SUPER_ADMIN_EMAIL`)
- Verification via Edge Function (`check-super-admin`)
- Client-side caching with 5-minute TTL
- No hardcoded credentials in client code

---

## 4. Data Protection & Privacy

### 4.1 Data Classification

| Classification | Examples | Protection Level |
|----------------|----------|------------------|
| Public | Public recipes | Open access |
| Internal | App configuration | Admin only |
| Confidential | User preferences, pantry items | Owner + Admin |
| Sensitive | Email, payment info | Encrypted, minimal access |

### 4.2 Encryption Standards

| Data State | Encryption | Standard |
|------------|------------|----------|
| In Transit | TLS 1.3 | HTTPS enforced |
| At Rest | AES-256 | Supabase managed |
| Backups | AES-256 | Supabase managed |

### 4.3 Row-Level Security (RLS)

All user data tables implement PostgreSQL RLS policies:

| Table | Policy | Description |
|-------|--------|-------------|
| profiles | User owns | Users can only access own profile |
| user_preferences | User owns | Users can only access own preferences |
| pantry_items | User owns | Users can only access own pantry |
| favorite_meals | User owns + public | Own recipes + public recipes |
| meal_plan_history | User owns | Users can only access own history |
| user_subscriptions | User owns | Users can only access own subscription |
| admin_action_logs | Admin only | Only admins can view logs |

**Implementation Reference:** `supabase/migrations/001_initial_schema.sql:98-148`

### 4.4 Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Account Data | Until deletion requested | CASCADE delete |
| Media Files (video/audio) | 10 days | Automatic cleanup |
| Saved Recipes | Until user deletes | Manual or CASCADE |
| Login History | 1 year | Automatic purge |
| Deleted Accounts | 30 days | Hard delete |

### 4.5 Data Portability

Users can export their data via the Settings page:
- Format: JSON
- Contents: Preferences, pantry items, saved recipes
- Delivery: Immediate download

---

## 5. API & Network Security

### 5.1 Content Security Policy (CSP)

Implemented via meta tag in `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  media-src 'self' blob: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co
              https://generativelanguage.googleapis.com https://api.stripe.com;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
  worker-src 'self' blob:;
">
```

### 5.2 Additional Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |

### 5.3 CORS Configuration

**Allowed Origins:**
- `https://kiwimealplanner.co.nz`
- `https://www.kiwimealplanner.co.nz`
- `https://kiwi-meal-planner-production.up.railway.app`
- `http://localhost:3000` (development only)
- `http://localhost:5173` (development only)

**Implementation Reference:** `supabase/functions/_shared/cors.ts`

### 5.4 API Authentication

All Edge Functions require authentication:

```typescript
// Standard auth verification pattern
const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 5.5 API Key Protection

| API Key | Storage Location | Access Method |
|---------|-----------------|---------------|
| Supabase Anon Key | Client-side (public) | Direct |
| Supabase Service Role | Supabase secrets | Edge Functions only |
| Stripe Secret Key | Supabase secrets | Edge Functions only |
| Stripe Webhook Secret | Supabase secrets | Edge Functions only |
| Gemini API Key | Supabase secrets | Edge Functions only |
| Super Admin Email | Supabase secrets | Edge Functions only |

---

## 6. Payment Security (PCI DSS)

### 6.1 Compliance Status

**PCI DSS Compliance: Level 4 Merchant (via Stripe)**

Kiwi Meal Planner does not store, process, or transmit cardholder data directly. All payment processing is handled by Stripe, a PCI DSS Level 1 Service Provider.

### 6.2 Payment Flow

```
User → Stripe Checkout (hosted) → Stripe processes payment → Webhook → App updates subscription
```

### 6.3 Security Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| Card data storage | None (Stripe handles) | ✅ Compliant |
| Secure transmission | TLS 1.3 | ✅ Compliant |
| Webhook signature verification | HMAC-SHA256 | ✅ Enabled |
| PCI-compliant checkout | Stripe Checkout | ✅ Compliant |

### 6.4 Webhook Security

**Implementation Reference:** `supabase/functions/stripe-webhook/index.ts`

```typescript
// Webhook signature verification
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  // HMAC-SHA256 signature verification
  // Timestamp validation (5-minute window)
  // Rejects invalid signatures with 400 status
}
```

---

## 7. Infrastructure Security

### 7.1 Hosting Security (Railway)

| Feature | Status |
|---------|--------|
| TLS 1.3 | ✅ Enabled |
| DDoS Protection | ✅ Enabled |
| Automatic HTTPS | ✅ Enabled |
| Container Isolation | ✅ Enabled |

### 7.2 Database Security (Supabase)

| Feature | Status |
|---------|--------|
| Encryption at rest | ✅ AES-256 |
| Encryption in transit | ✅ TLS |
| Row Level Security | ✅ All tables |
| Connection pooling | ✅ Enabled |
| Automated backups | ✅ Daily |

### 7.3 Edge Function Security (Deno)

| Feature | Status |
|---------|--------|
| Sandboxed execution | ✅ Enabled |
| No file system access | ✅ Default |
| Network restrictions | ✅ Configurable |
| Secret management | ✅ Environment variables |

---

## 8. Regulatory Compliance

### 8.1 New Zealand Privacy Act 2020

| Information Privacy Principle | Status | Implementation |
|------------------------------|--------|----------------|
| IPP 1 - Purpose of Collection | ✅ Compliant | Clear purpose in privacy policy |
| IPP 2 - Source of Information | ✅ Compliant | Direct collection from users |
| IPP 3 - Collection Notice | ✅ Compliant | Privacy policy accessible |
| IPP 4 - Manner of Collection | ✅ Compliant | Lawful, non-intrusive |
| IPP 5 - Storage and Security | ✅ Compliant | Encryption, access controls |
| IPP 6 - Access to Information | ✅ Compliant | Data export available |
| IPP 7 - Correction of Information | ✅ Compliant | User can update profile |
| IPP 8 - Accuracy | ✅ Compliant | User controls own data |
| IPP 9 - Retention | ✅ Compliant | Clear retention periods |
| IPP 10 - Use Limitation | ✅ Compliant | Data used only for stated purposes |
| IPP 11 - Disclosure | ✅ Compliant | Third parties documented |
| IPP 12 - Cross-Border Disclosure | ✅ Compliant | International transfers documented |
| IPP 13 - Unique Identifiers | ✅ Compliant | Standard auth identifiers |

### 8.2 Consumer Guarantees Act 1993

The application acknowledges consumer rights under New Zealand law. Terms of Service do not limit statutory consumer protections.

### 8.3 AI-Generated Content Disclaimer

All AI-generated content (meal plans, recipes, nutritional information) includes appropriate disclaimers:
- Not professional dietary/medical advice
- Users should verify allergen information
- Food safety responsibility lies with user

### 8.4 Third-Party Data Processors

| Provider | Purpose | Location | Compliance |
|----------|---------|----------|------------|
| Supabase | Database, Auth, Storage | USA/EU | SOC 2 Type II |
| Google Cloud (Gemini) | AI processing | USA | ISO 27001 |
| Stripe | Payment processing | USA | PCI DSS Level 1 |
| Railway | Application hosting | USA | SOC 2 |

---

## 9. Incident Response

### 9.1 Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Data breach, service outage | 1 hour |
| High | Security vulnerability exploited | 4 hours |
| Medium | Potential vulnerability discovered | 24 hours |
| Low | Minor security improvement needed | 7 days |

### 9.2 Breach Notification

In the event of a privacy breach posing risk of serious harm:

1. **Immediate:** Contain the breach
2. **Within 72 hours:** Notify Privacy Commissioner (if required)
3. **As soon as practicable:** Notify affected individuals
4. **Document:** Record breach details and response

### 9.3 Contact for Security Issues

**Security Contact:** admin@unicloud.co.nz
**Privacy Officer:** Unicloud Limited
**Website:** www.unicloud.co.nz

---

## 10. Security Controls Matrix

### 10.1 OWASP Top 10 (2021) Mitigation

| Risk | Status | Mitigation |
|------|--------|------------|
| A01: Broken Access Control | ✅ Mitigated | RLS policies, RBAC, admin controls |
| A02: Cryptographic Failures | ✅ Mitigated | TLS 1.3, AES-256 at rest |
| A03: Injection | ✅ Mitigated | Parameterized queries (Supabase SDK) |
| A04: Insecure Design | ✅ Mitigated | Security-first architecture |
| A05: Security Misconfiguration | ✅ Mitigated | CSP, security headers, CORS |
| A06: Vulnerable Components | ✅ Monitored | Regular dependency updates |
| A07: Auth Failures | ✅ Mitigated | PKCE OAuth, session management |
| A08: Data Integrity Failures | ✅ Mitigated | Webhook signatures, input validation |
| A09: Logging Failures | ✅ Mitigated | Admin action logs, login history |
| A10: SSRF | ✅ Mitigated | Edge Function isolation |

### 10.2 Security Features Summary

| Feature | Status | Reference |
|---------|--------|-----------|
| Multi-factor Authentication | ⏳ Planned | Future enhancement |
| Rate Limiting | ✅ Enabled | `rate_limit_logs` table, Edge Functions |
| Server-side Subscription Validation | ✅ Enabled | `validate-subscription` Edge Function |
| Admin Notifications | ✅ Enabled | `admin_notifications` table |
| User Consent Management | ✅ Enabled | `user_consents` table |
| API Key Rotation | ⏳ Planned | Future enhancement |
| Security Audit Logging | ✅ Enabled | `admin_action_logs` table |
| Automated Vulnerability Scanning | ⏳ Planned | Future enhancement |
| Penetration Testing | ⏳ Planned | Future enhancement |

---

## 11. Audit Log

### 11.1 Security Changes Log

| Date | Change | Implemented By |
|------|--------|----------------|
| Jan 2026 | Implemented API rate limiting (10 req/min for AI, 60 req/min standard) | Security Enhancement |
| Jan 2026 | Added server-side subscription validation Edge Function | Security Enhancement |
| Jan 2026 | Implemented admin notification system with email alerts | Security Enhancement |
| Jan 2026 | Added user consent management system (GDPR/Privacy Act compliance) | Security Enhancement |
| Jan 2026 | Created ConsentBanner component for explicit user consent | Security Enhancement |
| Jan 2026 | Enabled Gemini Edge Functions (API key protection) | Security Audit |
| Jan 2026 | Enabled Stripe webhook signature validation | Security Audit |
| Jan 2026 | Restricted CORS to allowed domains | Security Audit |
| Jan 2026 | Added Content Security Policy headers | Security Audit |
| Jan 2026 | Moved super admin to Supabase secret | Security Audit |
| Jan 2026 | Deployed check-super-admin Edge Function | Security Audit |
| Dec 2024 | Initial privacy policy implementation | Development |
| Dec 2024 | Row Level Security policies | Development |

### 11.2 Pending Security Enhancements

| Priority | Enhancement | Target |
|----------|-------------|--------|
| Low | IP anonymization options | Q2 2026 |
| Low | Multi-factor authentication | Q3 2026 |
| Low | Automated vulnerability scanning | Q4 2026 |

---

## 12. Contact Information

### 12.1 Company Details

**Unicloud Limited**
Trading as: unicloud.co.nz
Website: www.unicloud.co.nz
Email: admin@unicloud.co.nz

### 12.2 Privacy Inquiries

For privacy-related inquiries or to exercise your rights under the Privacy Act 2020:
Email: admin@unicloud.co.nz
Response time: Within 20 working days

### 12.3 Security Vulnerabilities

To report a security vulnerability:
Email: admin@unicloud.co.nz
Subject: [SECURITY] Vulnerability Report

### 12.4 Privacy Commissioner

If you are not satisfied with our response to a privacy concern:
Office of the Privacy Commissioner
Website: www.privacy.org.nz

---

## Appendix A: File References

| File | Purpose |
|------|---------|
| `services/authService.ts` | Authentication configuration |
| `services/adminService.ts` | Admin and super admin verification |
| `services/subscriptionService.ts` | Subscription management |
| `components/AuthProvider.tsx` | Auth context and impersonation |
| `components/LegalPages.tsx` | Privacy policy, terms, data handling |
| `supabase/functions/_shared/cors.ts` | CORS configuration |
| `supabase/functions/_shared/auth.ts` | Edge Function authentication |
| `supabase/functions/stripe-webhook/index.ts` | Payment webhook handling |
| `supabase/functions/check-super-admin/index.ts` | Super admin verification |
| `supabase/migrations/001_initial_schema.sql` | Database RLS policies |
| `index.html` | Security headers (CSP) |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| CSP | Content Security Policy - controls resources the browser can load |
| CORS | Cross-Origin Resource Sharing - controls cross-domain requests |
| JWT | JSON Web Token - secure token format for authentication |
| PKCE | Proof Key for Code Exchange - secure OAuth flow |
| RLS | Row Level Security - PostgreSQL database-level access control |
| PCI DSS | Payment Card Industry Data Security Standard |
| TLS | Transport Layer Security - encryption for data in transit |

---

*Document End*

**Document Control:**
- Version: 1.0
- Status: Active
- Review Cycle: Annual
- Next Review: January 2027
