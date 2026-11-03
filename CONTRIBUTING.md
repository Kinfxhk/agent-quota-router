# Contributing · agent-quota-router

## Scope

M0 is an **assembly guide + config contract + pure TypeScript helpers** for AccountPool / Plan selection. Do not add HTTP LLM clients, plaintext key storage, or a second resolve-wrap path without a new milestone.

## Clean-room

Do not copy competitor UI, strings, or assets. Do not put vendor brand names (e.g. Grok, DeepSeek) in the **product title**. Technical “compatible with DSH” in docs is OK.

## Secrets

Never commit API keys, tokens, or credentials files. Use `.env.example` with empty values only. Fixtures must use fake refs such as `cred_ref_demo_a`.

## AI-assisted development

Human (or maintaining agent) must review every line. Run `npm run check` before claiming done. Disclose AI tools in PR text when contributing publicly.

## Checks

```bash
npm ci
npm run check
```

## License

MIT. By contributing you agree your changes are MIT-licensed.
