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

## Deployment and checks

The hosted app uses GitHub sign-in and GitHub Pages. Collections start private. Use Share to create a read-only link, copy it again later, or turn it off. A reader must sign in. Revocation stops future access but cannot remove copies someone saved.

Entries can be added, edited, deleted, searched, filtered, and exported as JSON under Privacy & storage. Bottle photos are optional, private to the owner, resized in the browser (JPEG, long edge 1280px, no EXIF) and never shown on shared links. Apply `supabase/storage.sql` after the schema.

**Label scanning** runs fully on the phone (tesseract.js, MIT/Apache, self-hosted under `public/ocr/`, loaded only when you tap the scan button; no photo or text leaves the device). It only prefills empty fields for you to check.

**Agent entry key** (`supabase/agent.sql`, apply after the schema): the owner approves a key hash through a pairing link `#pair=<sha256 hex>`; the secret stays with the agent. The key can only call `agent_add_wine` (insert for that owner, max 30 per hour). It cannot read, edit, delete, see photos, or share. The owner can turn it off in Privacy & storage. `agent.html` is a bare form that posts to that function.

`npm test` checks input validation, safe text rendering, row isolation, blocked owner spoofing, and read-only revocable sharing against PostgreSQL through PGlite. Production checks include GitHub OAuth, saved edits surviving reload, anonymous denial, a separate authenticated database subject seeing no private rows, and share-link revocation.

For GitHub Pages, rebuild and copy `dist/` into `docs/`, including `.nojekyll`, then publish `main:/docs`. Keep project credentials and private seed migrations out of this repository.

## License

MIT. See `LICENSE`.
