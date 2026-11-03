# Security · agent-quota-router

## Reporting

Email the KINFX maintainer privately for vulnerabilities. Do not open public issues with exploit details or leaked secrets.

## Secrets policy

- No real credentials in git, CI logs, fixtures, or examples.
- Config stores **credential refs** only (names), never plaintext keys.
- Runtime keys: host credentials store (e.g. `$DSH_HOME/.credentials.yaml`) or user secret store.
- This package does **not** HTTP-call LLM providers and does **not** resolve secret material itself.

## Supply chain

When assembling with a DSH-compatible host, pin `@deepseek-ai/dsh@0.2.1-rc.5`. Re-verify peer ranges before upgrading. Install **exactly one** resolve-wrap plugin (`@omdp/dsh-key-fallback` **or** `@goodandready/dsh-key-rotation`), never both.
