# Vokitoki Admin Panel — Production Rebuild (Design Spec)

**Date:** 2026-07-21
**Status:** Approved (requirements confirmed via clarifying questions)

## Goal

Rebuild `chat-app-admin` into a production-ready, professional admin panel for the
Vokitoki chat platform (web `chat-app` + mobile `chat-app-mobile`), matching Vokitoki's
design language and behaving like a professional admin console.

## Context

- Vokitoki web (`chat-app`) and mobile (`chat-app-mobile`) share **one Go backend** and
  **one MongoDB**. Therefore **one responsive admin web panel** manages both platforms.
  We are **not** building a separate native admin app.
- The admin panel is a **Next.js 16 App Router** app that connects **directly to MongoDB**
  via Mongoose and authenticates with the **same JWT secret** as the main app.
- Design tokens in `app/globals.css` are already identical to Vokitoki (zinc/blue,
  dark/light). We keep them.
- Go source-of-truth models live in `chat-app/api/internal/models`. The admin's Mongoose
  models have drifted and must be resynced.

## Confirmed requirements

1. **Approach:** Rebuild in place — keep Next.js + direct MongoDB + existing JWT auth,
   re-architect into clean reusable components, add missing pages, harden for production.
2. **Capabilities to add:** Chats & Groups management, Analytics & growth, Audit log,
   Bot & Broadcast.
3. **Roles:** Two-tier — Super Admin + Moderator (granular permissions).
4. **Data safety:** Soft-delete + confirmation + audit for destructive actions.

## Architecture

- **Layers**
  - `models/` — Mongoose schemas resynced with Go, plus admin-only `AuditLog`,
    `Announcement`, `AdminSetting`.
  - `lib/permissions.ts` — role → permission matrix.
  - `lib/withAdmin.ts` — single wrapper for every admin API route: verify JWT, load admin,
    check required permission, rate-limit, and write an audit entry on mutations.
  - `lib/api.ts` — response envelope `{ ok, data, error }` + pagination helper.
  - `lib/audit.ts` — audit log writer.
  - `components/admin/*` — reusable UI primitives (DataTable, StatCard, Chart, PageHeader,
    SearchBar, Modal, ConfirmDialog, Badge, Pagination, Toast, Skeleton, EmptyState,
    ErrorState).
  - `app/admin/*` — pages composed only from primitives.
- **Server-side auth guard** in the admin layout verifies admin role (not just token).

## Roles & permissions

- Add `adminRole?: 'superadmin' | 'moderator'` to User. Existing `role: 'admin'` with no
  `adminRole` ⇒ treated as **superadmin** (backward compatible).
- **Moderator** may: view all data; remove messages/stories; resolve/dismiss reports;
  timeout/ban/deactivate users. **May not:** change roles, hard-delete users, send
  broadcasts, edit settings, manage other admins.
- Enforced server-side in every route via the permission matrix, and mirrored in the UI
  (controls hidden/disabled).

## Data safety

- **Soft-delete + audit** everywhere:
  - Messages/stories: add `removedByAdmin`, `removedBy`, `removedAt`, `removeReason`.
  - Users: reversible `isDeactivated` state (distinct from ban/timeout).
- **Hard delete** is superadmin-only, behind a double confirmation.
- Every mutating admin action writes an `AuditLog` entry (actor, action, target, reason,
  IP, timestamp).

## Pages / navigation

| Page | Status | Purpose |
|---|---|---|
| Dashboard | rebuilt | KPIs + activity charts |
| Analytics | new | DAU/MAU, growth, retention, message/media volume, top users |
| Users | rebuilt | Accounts, roles, ban/timeout/deactivate, verified/gender |
| Chats & Groups | new | Browse DMs & groups, members, lock/remove |
| Messages | rebuilt | Content moderation + context view |
| Stories | rebuilt | Story moderation |
| Reports | rebuilt | Moderation queue with target preview |
| Broadcast | new | Compose & send announcements + history |
| Bot | new | Bot usage overview + global persona/settings |
| Audit Log | new | Searchable admin-action history |
| Settings | new | Feature flags + manage admins (superadmin only) |

## New models

- **AuditLog:** `{ actorId, actorUsername, action, targetType, targetId, targetLabel,
  metadata, reason, ip, createdAt }`.
- **Announcement:** `{ title, body, audience, createdBy, status, sentAt, deliveredCount }`.
- **AdminSetting:** `{ key, value, updatedBy, updatedAt }` for feature flags.

## API design

- Consistent envelope `{ ok, data, error }` and pagination `{ page, limit, total, pages }`.
- Manual input validation on each route.
- Rate-limited (Upstash, already configured), permission-checked, audited via `withAdmin`.

## Broadcast delivery

- Announcements persisted to Mongo and delivered as messages from an official system
  account into users' inboxes (surfaced by the apps on next sync). Deep real-time push via
  the Go WS backend is **future work** — v1 is persist + best-effort and does not touch the
  Go service.

## Testing & verification

- Shared primitives + identical tokens ⇒ visual consistency with Vokitoki.
- **Verification gate:** `tsc --noEmit` and `next build` must pass; manual run-through.
- **Vitest** for pure logic: permission matrix, query builders, audit writer.

## Implementation phases (plan outline)

- **Phase 0 — Foundation:** resync models; add AuditLog/Announcement/AdminSetting;
  permission matrix; `withAdmin` wrapper; `lib/api.ts`, `lib/audit.ts`; shared UI
  primitives; server auth guard; admin theme toggle.
- **Phase 1 — Rebuild core:** Dashboard, Users, Messages, Stories, Reports on the new
  primitives with soft-delete + audit + role gating.
- **Phase 2 — New capabilities:** Chats & Groups, Analytics, Audit Log, Broadcast, Bot,
  Settings/manage-admins.
- **Phase 3 — Hardening:** rate limiting, validation, error boundaries, accessibility,
  responsive QA, green build, updated README.

## Out of scope (v1)

- Separate native admin mobile app.
- Modifying the Go backend or the main web/mobile apps.
- Real-time WS push for broadcasts (best-effort persistence only).
