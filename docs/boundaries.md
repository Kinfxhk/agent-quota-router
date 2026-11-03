# Boundaries · agent-quota-router M0

| Concern | Owner | Notes |
|---------|-------|-------|
| Credential store / `resolve` | Host (e.g. DSH `credentials`) | Refs only in this repo; values outside git |
| Same-provider key pool | **Exactly one** resolve-wrap | `@omdp/dsh-key-fallback` **or** `@goodandready/dsh-key-rotation` — never both |
| Model / provider degrade | `dsh-llm-fallbacks` | Not a second credential store |
| Retry | Host `dsh-llm-retry` | Router / wrap change ref or model, then hand back |
| Plan → modelPin + pool pick | **This package** (pure helpers + config) | No HTTP; no plaintext keys |
| Host pin | `@deepseek-ai/dsh@0.2.1-rc.5` | Documented assembly target |

## Compliance

Multi-account / multi-key rotation may be restricted by vendor ToS. Users must ensure each credential is authorized. This project does **not** document bypass steps and does **not** encourage circumventing rate limits or billing.
