# Cork

A small wine journal for your phone. Remember the bottles worth another glass.

Private-by-default collections. Personal ratings from 0 to 10. Search by producer, wine, vintage, and country. Filter by style and sort by rating or date. Optional read-only sharing can be turned off at any time.

## Run locally

Node 22 or newer:

```sh
npm ci
cp .env.example .env
npm run dev
```

Set the Supabase project URL and public publishable key in `.env`. Never use a service-role key in a browser build.

```sh
npm test
npm run build
```

## Backend

Use a dedicated Supabase project, apply `supabase/schema.sql`, and configure an authentication provider and allowed redirect URLs. Tables use row-level security: each signed-in person can read and change only their own wines. Anonymous users have no table permissions. Sharing uses an explicit revocable random token and returns only wine fields, never account IDs or emails.

The public repository contains code only. Do not commit personal tasting entries, photos, database exports, credentials, sign-in links, or private share URLs. The hosted app talks directly to Supabase; no analytics or ad services are included.

## Free-tier limits

Supabase may pause a free project after one week of inactivity. Its default email service is not production-ready and sends only to organization members. Configure an external email service or a social-login provider before enabling public sign-ups. Export entries you care about; free hosting is not a backup guarantee.

## Current development status

This is pre-release source. Production authentication, cross-account isolation, sharing, and seeded private data must pass end-to-end checks before a release is called ready.

## License

MIT. See `LICENSE`.
