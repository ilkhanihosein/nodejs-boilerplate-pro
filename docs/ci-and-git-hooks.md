# CI and Git hooks

Automation that keeps **`npm run check`** green before code lands on the default branch.

---

## GitHub Actions

Workflow: **`.github/workflows/ci.yml`**

| Trigger                                                    | Job       | Steps (summary)                                                                                                                                                        |
| ---------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to **`main`** / **`master`**, or any **pull_request** | **check** | Checkout → Node from **`.nvmrc`** (`actions/setup-node` **`node-version-file`**) + npm cache → **`npm ci`** → **`npm audit --audit-level=high`** → **`npm run check`** |

**`npm run check`** runs, in order: **Prettier** (`format:check`), **ESLint**, **Vitest** with **coverage** (`test:ci` — thresholds in **`vitest.config.ts`**), **frontend** `tsc`, **`npm run build`**, **`openapi:check`**. Failing any step fails the job.

**`npm audit`:** the workflow fails on **high** and **critical** advisories only (see npm **`--audit-level`**). Tighten to **`moderate`** or add **`--production`** if your team policy requires it.

**Dependabot:** **`.github/dependabot.yml`** opens weekly **npm** update PRs for the repo root.

To add steps (for example **migrations** against a service container), extend the workflow; document new expectations in this file or in [troubleshooting.md](./troubleshooting.md).

---

## Husky and lint-staged

- **`prepare`** in **`package.json`** installs **Husky** so Git hooks run after **`npm install`**.
- **Pre-commit** (configured via Husky) runs **lint-staged** on staged files:
  - **`*.ts`**, **`*.mjs`**, **`*.cjs`** — **Prettier** then **ESLint** (`--max-warnings=0`).
  - **`*.json`**, **`*.md`**, **`*.yml`**, **`*.yaml`** — **Prettier** only.

So commits that touch those extensions get auto-formatted and lint-fixed where possible. **CI** still runs the full repo **`format:check`** and **`lint`** without staged scope—local hooks are a first line, not a substitute.

---

## Related documents

| Topic           | Document                                   |
| --------------- | ------------------------------------------ |
| Tests           | [testing.md](./testing.md)                 |
| Troubleshooting | [troubleshooting.md](./troubleshooting.md) |
