# VokiToki Admin

A production-ready administration console for the [VokiToki](https://vokitoki.vercel.app)
chat platform (web + mobile). Both apps share one backend and one MongoDB, so this single
responsive panel administers the entire platform.

Built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and
**Mongoose**, matching VokiToki's design language.

## Accessing the panel

1. Navigate to `/` and sign in. **Only accounts with the `admin` role may sign in** — all
   others are rejected at login.
2. Every session is verified server-side against the database on each request.

## Roles

Two-tier access, enforced both server-side (on every API route) and in the UI:

| Capability | Super Admin | Moderator |
| --- | :---: | :---: |
| View all sections | ✓ | ✓ |
| Moderate content (remove messages/stories, resolve reports) | ✓ | ✓ |
| Ban / timeout / deactivate users | ✓ | ✓ |
| Change roles & manage the admin team | ✓ | — |
| Hard-delete users, delete conversations | ✓ | — |
| Send broadcasts, edit settings & bot config | ✓ | — |

An existing `admin` account with no explicit tier is treated as **Super Admin** (backward
compatible).

## Features

- **Dashboard** — live platform KPIs and 7-day activity charts.
- **Analytics** — growth, daily/monthly active users, message volume, media breakdown,
  and the most active users, across 7/30/90-day ranges.
- **Users** — search/filter/sort accounts; ban, timeout, deactivate (reversible), promote,
  or hard-delete (super admin), all behind confirmation dialogs.
- **Chats & Groups** — browse direct and group conversations, inspect members and recent
  messages, remove members, or delete a conversation.
- **Messages** — search by content or `@user`, view surrounding context, and soft-remove or
  restore messages.
- **Stories** — media gallery with lightbox; remove or restore stories.
- **Reports** — moderation queue with target snapshots; resolve (with notes) or dismiss.
- **Broadcast** — compose platform announcements to a chosen audience, with full history.
- **Bot** — AI-assistant usage stats and a configurable default persona.
- **Audit Log** — a filterable, timestamped trail of every administrative action.
- **Settings** — feature flags and admin-team role management.

## Safety & accountability

- **Soft-delete by default.** Destructive actions are reversible where possible
  (deactivate vs. delete, remove vs. restore); irreversible actions require confirmation.
- **Everything is audited.** Every mutation records the actor, action, target, reason, IP,
  and timestamp.
- **Rate limiting.** Login and admin APIs are rate-limited via Upstash.

## Architecture

- `models/` — Mongoose schemas mirroring the Go backend, plus admin-only `AuditLog`,
  `Announcement`, `AdminSetting`.
- `lib/permissions.ts` — the role → permission matrix (single source of truth).
- `lib/withAdmin.ts` — one wrapper wrapping every admin route with auth, permission checks,
  rate limiting, audit binding, and error handling.
- `lib/api.ts` — the `{ ok, data }` response envelope and pagination helpers.
- `components/admin/` — shared UI primitives so every page is visually consistent.
- `app/admin/` — pages composed from those primitives.

## Environment

Set these in `.env.local` (see the app's existing config):

```
MONGODB_URI=...
DB_NAME=chat-app
JWT_SECRET=...            # must match the main VokiToki app
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
```

## License

This project is licensed under the [MIT License](LICENSE).
