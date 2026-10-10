# Security

Never report a security issue with private tasting data or credentials in a public issue. Contact the repository maintainer privately through GitHub.

Database access must use row-level security. A browser publishable key is public by design; a service-role key is a secret and must never appear in the frontend, repository, or commit history.

Sharing links are bearer access: anyone with the link and a Cork account can read the shared collection. Revoking a link stops future access but cannot erase copies someone already saved. The project operator and Supabase can access stored data. Browser storage contains sign-in tokens; sign out on a shared device.

This application has no claim of absolute security. Release reviews should test two unrelated users plus anonymous access, altered owner IDs, update/delete attacks, revoked sharing links, and HTML injection.
