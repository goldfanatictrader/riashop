# Production Deployment Checklist

This checklist deploys the single Cloudflare Worker, D1 database, R2 bucket, and static PWA defined by `wrangler.jsonc`. Run commands from the repository root with Node.js 22 or newer.

## 1. Prepare and authenticate

- [ ] Install exactly the locked dependencies and run the release gates:

  ```sh
  npm ci
  npm run lint
  npm run typecheck
  npm test
  npm run build
  ```

- [ ] Sign in to the intended Cloudflare account and confirm it:

  ```sh
  npx wrangler login
  npx wrangler whoami
  ```

## 2. Create and bind D1

- [ ] Create the production database:

  ```sh
  npx wrangler d1 create ria-noel-shop
  ```

- [ ] Copy the returned database UUID into `d1_databases[0].database_id` in `wrangler.jsonc`, replacing the all-zero placeholder. Keep the binding name `DB`, database name `ria-noel-shop`, and migrations directory `migrations` unchanged.
- [ ] Review, then apply all checked-in migrations to the remote database:

  ```sh
  npx wrangler d1 migrations list ria-noel-shop --remote
  npx wrangler d1 migrations apply ria-noel-shop --remote
  ```

## 3. Create and bind R2

- [ ] Create the production bucket:

  ```sh
  npx wrangler r2 bucket create ria-noel-shop-files
  ```

- [ ] Confirm `wrangler.jsonc` binds that bucket to `FILES`. Do not make the bucket publicly writable; product images and invoice archives are served through authenticated Worker routes.

## 4. Set Worker secrets

- [ ] Set the operator passcode. Use a private value that is not committed to source control:

  ```sh
  npx wrangler secret put OPERATOR_PASSCODE
  ```

- [ ] Set an independent, high-entropy session signing secret of at least 32 characters:

  ```sh
  npx wrangler secret put SESSION_SECRET
  ```

- [ ] Keep production secrets out of `.dev.vars`, shell history, support messages, and frontend configuration.

## 5. Deploy and verify

- [ ] Rebuild the static PWA and deploy the Worker:

  ```sh
  npm run build
  npx wrangler deploy
  ```

- [ ] Save the deployed `workers.dev` URL printed by Wrangler.
- [ ] Set the deployment monitor/Healthcheck URL to:

  ```text
  https://<deployed-host>/api/v1/health
  ```

  A healthy response is HTTP 200 with D1 and R2 both reported as `ok`. An HTTP 503 means a binding or storage service is not ready.
- [ ] Verify login, logout, product image upload, invoice finalization, PDF preview/archive, and history against production bindings without using real customer data for the smoke test.
- [ ] Complete every P0 scenario in `docs/12_QA_AND_ACCEPTANCE.md` on a real Android phone, including native PDF sharing, before declaring the release shipped.

## 6. Custom domain and operations

- [ ] Add the custom domain in Cloudflare Workers **Settings → Domains & Routes**, or deploy with `npx wrangler deploy --domain shop.example.com` after the domain is active in the same Cloudflare account.
- [ ] Update the Healthcheck URL to the final custom-domain host and verify HTTPS before operator use. The session cookie is `Secure`, so production use must remain HTTPS-only.
- [ ] Confirm the custom domain serves the same CSP and security headers as the `workers.dev` host and that the installable PWA launches within the custom-domain origin.
- [ ] Document the chosen D1/R2 backup and recovery routine before entering customer data. Keep all migrations in source control and periodically test restoration/export procedures appropriate to the Cloudflare plan.
