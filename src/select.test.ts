// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { applyCooldown, isInCooldown, selectAccountForPlan } from './select.js';
import type { AccountRuntimeState, QuotaRouterConfig } from './types.js';

const baseConfig = (): QuotaRouterConfig => ({
  version: 0,
  enabled: true,
  providers: [
    { id: 'example-primary', displayName: 'Example primary' },
    { id: 'example-research', displayName: 'Example research' },
  ],
  accounts: [
    {
      id: 'acct_demo_a',
      providerId: 'example-primary',
      credentialRef: 'cred_ref_demo_a',
      enabled: true,
    },
    {
      id: 'acct_demo_b',
      providerId: 'example-primary',
      credentialRef: 'cred_ref_demo_b',
      enabled: true,
    },
    {
      id: 'acct_demo_c',
      providerId: 'example-primary',
      credentialRef: 'cred_ref_demo_c',
      enabled: false,
    },
  ],
  pools: [
    {
      id: 'pool_primary',
      providerId: 'example-primary',
      accountIds: ['acct_demo_a', 'acct_demo_b', 'acct_demo_c'],
      cooldownMs: 60_000,
      rotateOn: [{ type: 'http_status', status: 429 }],
    },
  ],
  plans: [
    {
      id: 'coding',
      displayName: 'Coding',
      poolId: 'pool_primary',
      modelPin: { providerId: 'example-primary', modelId: 'example-coding-model' },
      enabled: true,
    },
  ],
  defaultPlanId: 'coding',
  defaultCooldownMs: 60_000,
  stayInPoolUnlessFallbackEnabled: true,
});

describe('selectAccountForPlan — rotate order', () => {
  it('picks first enabled account in pool order', () => {
    const r = selectAccountForPlan(baseConfig(), 'coding', [], 1_000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.account.id).toBe('acct_demo_a');
    expect(r.account.credentialRef).toBe('cred_ref_demo_a');
    expect(r.modelPin.modelId).toBe('example-coding-model');
  });

  it('skips disabled accounts and continues order', () => {
    const cfg = baseConfig();
    cfg.accounts[0]!.enabled = false;
    const r = selectAccountForPlan(cfg, 'coding', [], 1_000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.account.id).toBe('acct_demo_b');
  });
});

describe('cooldown skip', () => {
  it('isInCooldown respects cooldownUntil', () => {
    const states: AccountRuntimeState[] = [
      { accountId: 'acct_demo_a', cooldownUntil: 5_000, consecutiveFailures: 1 },
    ];
    expect(isInCooldown(states, 'acct_demo_a', 4_999)).toBe(true);
    expect(isInCooldown(states, 'acct_demo_a', 5_000)).toBe(false);
    expect(isInCooldown(states, 'acct_demo_b', 4_999)).toBe(false);
  });

  it('applyCooldown then select skips cooled account and picks next', () => {
    const now = 10_000;
    let states: AccountRuntimeState[] = [];
    states = applyCooldown(states, 'acct_demo_a', 60_000, now, 'RATE_LIMIT');
    expect(states[0]?.cooldownUntil).toBe(70_000);
    expect(states[0]?.consecutiveFailures).toBe(1);

    const r = selectAccountForPlan(baseConfig(), 'coding', states, now + 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.account.id).toBe('acct_demo_b');
  });
});

describe('pool exhausted', () => {
  it('returns pool_exhausted when all enabled accounts are cooling', () => {
    const now = 10_000;
    let states: AccountRuntimeState[] = [];
    states = applyCooldown(states, 'acct_demo_a', 60_000, now);
    states = applyCooldown(states, 'acct_demo_b', 60_000, now);
    const r = selectAccountForPlan(baseConfig(), 'coding', states, now + 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('pool_exhausted');
  });

  it('does not use undeclared fallback when stayInPoolUnlessFallbackEnabled', () => {
    const cfg = baseConfig();
    cfg.providers.push({ id: 'example-research', displayName: 'Research' });
    cfg.accounts.push({
      id: 'acct_demo_research',
      providerId: 'example-research',
      credentialRef: 'cred_ref_demo_research',
      enabled: true,
    });
    cfg.pools.push({
      id: 'pool_research',
      providerId: 'example-research',
      accountIds: ['acct_demo_research'],
      cooldownMs: 60_000,
      rotateOn: [],
    });
    // no fallbackPoolIds on plan; stayInPool true → exhausted
    const now = 10_000;
    let states: AccountRuntimeState[] = [];
    states = applyCooldown(states, 'acct_demo_a', 60_000, now);
    states = applyCooldown(states, 'acct_demo_b', 60_000, now);
    const r = selectAccountForPlan(cfg, 'coding', states, now + 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('pool_exhausted');
  });
});
