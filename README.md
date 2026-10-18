# Cork

A small drink journal for your phone. Remember the bottles worth another glass.

Private-by-default collections. Personal ratings from 0 to 10 for wine, soju, makgeolli, beer, whisky, cocktails, sake and more. Rank within each drink type or across everything. Search by brand, name, vintage, and country. Filter wine by style and sort by rating or date. Vintage and style are wine-only; other drinks carry brand and ABV. Wines can also carry an optional taste profile: four 1 to 5 scales - sweetness (dry to sweet), acidity (soft to acidic), tannin (smooth to tannic) and body (light to bold) - shown as dots on each entry. Scales are only ever set by hand; nothing is auto-filled. Optional read-only sharing can be turned off at any time.

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

Use a dedicated Supabase project, apply `supabase/schema.sql`, and configure an authentication provider and allowed redirect URLs. Tables use row-level security: each signed-in person can read and change only their own entries. Anonymous users have no table permissions. Sharing uses an explicit revocable random token and returns only entry fields, never account IDs or emails. Apply `supabase/drinks.sql` after the other table migrations: it adds the drink type and ABV columns, keeps vintage and style wine-only, and widens `shared_wines` and the agent functions to every type. Apply `supabase/characteristics.sql` last: it adds the four optional wine taste scales, keeps them wine-only, and carries them through `shared_wines` and `agent_add_wine`.

The public repository contains code only. Do not commit personal tasting entries, photos, database exports, credentials, sign-in links, or private share URLs. The hosted app talks directly to Supabase; no analytics or ad services are included.

## Free-tier limits

Supabase may pause a free project after one week of inactivity. Its default email service is not production-ready and sends only to organization members. Configure an external email service or a social-login provider before enabling public sign-ups. Export entries you care about; free hosting is not a backup guarantee.

## Deployment and checks

The hosted app uses GitHub sign-in and GitHub Pages. Collections start private. Use Share to create a read-only link, copy it again later, or turn it off. A reader must sign in. Revocation stops future access but cannot remove copies someone saved.

Entries can be added, edited, deleted, searched, filtered by type (and by style for wine), and exported as JSON under Privacy & storage. Label photos are optional, private to the owner, resized in the browser (JPEG, long edge 1280px, no EXIF) and never shown on shared links. Apply `supabase/storage.sql` after the schema.

**Label scanning** uses Cloudflare Workers AI `@cf/qwen/qwen3.8-27b` through the authenticated `label-scan` Edge Function. The prompt adapts to the selected drink type: wine labels return vintage and style, other drinks return brand and ABV. Apply `supabase/label-scan.sql`, set `CLOUDFLARE_AI_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` only in Supabase secrets, and deploy the function. The handler verifies the current signed-in, non-anonymous Auth user; a publishable key, share token or agent-entry key is insufficient. It bounds, decodes and re-encodes the JPEG to remove metadata. Only the fixed transcription prompt and label JPEG go to Cloudflare. No scanning upload or photo/result logging is performed. Quota counters store an owner UUID, minute/day timestamps and counts only. Limits: 3/minute and 20/day per person. Workers Free has a shared 10,000-neuron daily allowance and errors on exhaustion; there is no paid fallback. Account billing must remain Free with no payment method. Cloudflare says it does not train on inputs or outputs without consent, but does not publish a zero-retention guarantee. See https://developers.cloudflare.com/workers-ai/platform/data-usage/ and https://developers.cloudflare.com/workers-ai/platform/pricing/.

Results are separate suggestions with an Accept control per field. Nothing is auto-filled or saved, and changing photos clears suggestions. Crop, lighting and vintage-check guidance is shown at scan time. Accuracy is limited: on four public bottle-image variants (two labels, full and cropped), the strict prompt still returned erroneous details on two variants. This is a small smoke test, not a representative accuracy benchmark. Enter unclear details yourself. Tesseract and its roughly 7 MB local model assets have been removed; there is no hidden fallback.

**Agent entry key** (`supabase/agent.sql`, apply after the schema): the owner approves a key hash through a pairing link `#pair=<sha256 hex>`; the secret stays with the agent. The key can only call `agent_add_wine` (insert for that owner, max 30 per hour, with optional taste scales for wine). It cannot read, edit, delete, see photos, or share. The owner can turn it off in Privacy & storage. `agent.html` is a bare form that posts to that function.

`npm test` checks input validation, safe text rendering, row isolation, blocked owner spoofing, and read-only revocable sharing against PostgreSQL through PGlite. Production checks include GitHub OAuth, saved edits surviving reload, anonymous denial, a separate authenticated database subject seeing no private rows, and share-link revocation.

For GitHub Pages, rebuild and copy `dist/` into `docs/`, including `.nojekyll`, then publish `main:/docs`. Keep project credentials and private seed migrations out of this repository.

## License

MIT. See `LICENSE`.

## Texted bottle photos
Apply `supabase/agent-photos.sql` after `agent.sql`. Deploy `supabase/functions/agent-photo/index.ts` as `agent-photo` with gateway JWT verification off (the function checks the paired agent key). It uses Supabase's server-only service-role environment variable, never a frontend service key.

The helper `/agent.html` adds a drink, then attaches a photo by exact producer/name/vintage and drink type. It only matches one entry belonging to the paired owner, requires no existing photo, and never replaces an image. Both claims and final attachment check the current key. The server accepts JPEGs up to 2 MB, dimensions at most 2000 px, decodes and re-encodes to remove metadata, stores in the owner's folder in the existing private bucket, and limits reservations to 30/hour. The key cannot read, edit, delete or share. Photos remain excluded from shared collection links. Turn off under Privacy & storage revokes future adds and attachments. This is not on-device-only: texted photos pass through the messaging service and Instinct, then Supabase. Project operators and Supabase can access storage. Do not log upload bodies or keys.

Failure handling: never retry a successful attachment. On an uncertain response, inspect current owner state before retrying. Failure after a reservation may require ten minutes before another attempt; storage objects are removed when attach fails. Duplicate drink identities intentionally require the owner to attach from the app instead of guessing.
