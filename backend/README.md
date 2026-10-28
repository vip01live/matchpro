# MatchPro server-side admin backend

## Current deployment status

The Worker is implemented in this repository but **not deployed**. Cloudflare credentials and production secret values are not available through the current connection. Until deployment and until `main/js/admin-backend-config.js` contains the Worker base URL, the CMS stays in its legacy browser-token mode. That legacy mode is not server-side authentication.

## Security design

- Username/password verification runs on the Worker, using PBKDF2-HMAC-SHA-256 with 310,000 iterations.
- Successful login returns a signed session with a 30-minute expiry. The admin page keeps it in memory rather than localStorage.
- GitHub token is stored only as a Worker secret.
- GitHub proxy is allowlisted to the CMS-required Contents and Git-data calls for `vip01live/matchpro` only.
- Worker checks browser Origin and, when present, the specific admin-page Referer prefix.
- Failed-login throttling is per Worker isolate and is best-effort. Add a Cloudflare rate-limit rule for `POST /api/login`; an in-memory map alone is not a distributed rate limiter.

The session is stateless. Logout clears the token in page memory, but a copied session remains valid until its 30-minute expiry. Immediate revocation requires a durable server-side session store.

## Deployment

1. Create a Cloudflare Worker from this directory or run `npx wrangler deploy` while in `backend/`.
2. Create a fine-grained GitHub token restricted to `vip01live/matchpro`, with **Contents: Read and write** and **Metadata: Read-only** permissions. Do not commit it.
3. Add Worker secrets:
   ```sh
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put SESSION_SECRET
   ```
4. Run `node hash-admin-password.mjs` from an interactive terminal. The password is typed without echoing. Store its two output values as Worker secrets:
   ```sh
   npx wrangler secret put ADMIN_PASSWORD_SALT
   npx wrangler secret put ADMIN_PASSWORD_HASH
   ```
5. Generate a fresh random session secret locally:
   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```
   Use at least 32 random characters and never commit it.
6. `wrangler.toml` configures the expected origin as `https://vip01live.github.io` and the admin path. Adjust if the site is moved. The admin document's `no-referrer-when-downgrade` policy allows the Worker to validate that HTTPS requests originate from this app path.
7. Deploy the Worker. Copy its public base URL to `window.MATCHPRO_ADMIN_API_BASE` in `main/js/admin-backend-config.js`, commit that URL (not credentials), and wait for the GitHub Pages deploy.
8. Add a Cloudflare rate-limit rule for `POST /api/login` and verify all Worker secrets before regular use.

## Tests

From `backend/`, run:

```sh
node --check cloudflare-worker.mjs
node --check hash-admin-password.mjs
node --test cloudflare-worker.test.mjs
```

Tests use mocked GitHub API responses; they do not contact production GitHub.

## Known limitations

- The Worker is not deployed and the config URL remains empty until an operator configures it.
- Static Pages maintenance mode is only a client-side overlay, not server-level access control.
- A cross-origin player iframe does not expose its internal clicks to MatchPro. Reliable ad recurrence after five internal player clicks requires the provider's API or an approved `postMessage` bridge.
