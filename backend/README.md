# MatchPro server-side administration backend

## Current deployment state

The Worker source and configuration are in this directory, but the Worker is not deployed and `main/js/admin-backend-config.js` has an empty URL. The admin panel now fails closed in this state: browser-side GitHub token login is disabled, and administrative changes are unavailable until the owner deploys and configures the Worker.

## Authentication and permissions

- The primary owner account is configured with Worker secrets. Password verification uses PBKDF2-HMAC-SHA-256 with 310,000 iterations.
- The owner can create, edit, activate, disable, and reset moderator accounts in the admin panel. Moderator passwords are salted and hashed before they enter the account store.
- Moderators receive the same CMS and site-editing GitHub proxy access as the owner. Only the owner can manage accounts or view the audit history.
- Moderator status and session version are checked on each protected request. Disabling or resetting a moderator account revokes existing sessions immediately.
- Sessions are signed, expire after 30 minutes, and remain in page memory only. Clearing an owner's copied session takes effect when it expires; owner session revocation is not backed by a server-side session registry.
- The GitHub token is stored only as a Worker secret. The proxy is allowlisted to the `vip01live/matchpro` repository and required Git-data calls.
- The Worker validates the browser Origin and checks the admin page Referer when the header is present. API responses are not cached and include restrictive security headers.

## Account and audit storage

`AccountStore` is a SQLite-backed Cloudflare Durable Object. Wrangler provisions its namespace through the `v1` migration in `wrangler.toml`. A single named object stores the small moderator roster, account session versions, and the most recent 1,000 audit records in transactional storage. Account records and their create/update audit event are written atomically. Audit entries cover sign-ins, moderator account changes, GitHub content writes, and successful or failed publication of the `main` branch.

The single account object is sized for this site's small administrative team. Keep Cloudflare account recovery access with the deployment owner. Do not put production passwords or GitHub tokens in this repository. GitHub content-write events record the API operation and, for tree updates, up to eight changed paths; request bodies and uploaded file contents are never written to the audit log. There is no application-level account-store export or restore procedure yet: losing the Durable Object would require recreating moderator accounts and would lose its audit history.

## Deployment

1. From this directory, install/use Wrangler and run `npx wrangler deploy`. The SQLite Durable Object binding and initial migration are declared in `wrangler.toml`.
2. Create a fine-grained GitHub token restricted to `vip01live/matchpro`, with **Contents: Read and write** and **Metadata: Read-only** permissions. Store it as the Worker secret `GITHUB_TOKEN`.
3. Add Worker secrets:

   ```sh
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put SESSION_SECRET
   ```

4. Run `node hash-admin-password.mjs` in an interactive terminal. It prompts without echoing the password. Store its outputs as `ADMIN_PASSWORD_SALT` and `ADMIN_PASSWORD_HASH` Worker secrets.
5. Generate a random session secret with at least 32 characters and do not commit it:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

6. Add a Cloudflare rate-limit rule for `POST /api/login`. The in-memory Worker throttle is best-effort and is not a distributed rate limiter.
7. Set the deployed Worker base URL in `main/js/admin-backend-config.js`, commit that public URL, and wait for the GitHub Pages deployment. The URL is not a credential.
8. Verify owner login, create a moderator, test their CMS access, disable the account, and confirm an existing moderator session is rejected on its next protected request.

The production Worker is not deployed from this workspace. Deployment requires the site owner's Cloudflare account and secrets; no production change was made.

## Tests and local checks

From the repository root:

```sh
node --check backend/cloudflare-worker.mjs
node --test backend/cloudflare-worker.test.mjs
node tools/validate-admin.mjs
node tools/validate-site.mjs
```

The Worker tests use a local fake Durable Object namespace and mocked GitHub responses. They do not contact production GitHub or Cloudflare. The Pages workflow runs `tools/apply-cms-metadata.py` before `tools/validate-site-performance.py`; run that pair in a disposable build copy because the generator rewrites HTML and channel image URLs for the Pages artifact.

## Known limitations

- Admin access remains unavailable until the Worker is deployed, its secrets are set, and the Worker URL is configured in the static site.
- Login throttling inside the Worker is isolate-local; the Cloudflare rate-limit rule in the deployment steps is required for shared edge protection.
- Logout removes the current in-memory token. A copied owner token stays valid until its 30-minute expiry; moderator accounts can be revoked immediately by disabling or resetting them.
- GitHub Pages maintenance mode is a client-side overlay, not server-side access control.
- Cross-origin player frames do not expose their internal clicks to MatchPro. Reliable ad recurrence after internal player clicks requires a provider API or an approved `postMessage` bridge.
