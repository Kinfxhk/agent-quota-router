// SPDX-License-Identifier: MIT
/**
 * Pure AccountPool / Plan selection helpers.
 * No HTTP. No credential resolution. No plaintext keys.
 */
import type {
  AccountRef,
  AccountRuntimeState,
  QuotaRouterConfig,
  SelectAccountResult,
} from './types.js';

export function isInCooldown(
  states: readonly AccountRuntimeState[],
  accountId: string,
  nowMs: number,
): boolean {
  const st = states.find((s) => s.accountId === accountId);
  if (!st?.cooldownUntil) return false;
  return st.cooldownUntil > nowMs;
}

export function applyCooldown(
  states: readonly AccountRuntimeState[],
  accountId: string,
  cooldownMs: number,
  nowMs: number,
  lastErrorCode?: string,
): AccountRuntimeState[] {
  const cooldownUntil = nowMs + Math.max(0, cooldownMs);
  const next: AccountRuntimeState[] = states.map((s) => ({ ...s }));
  const idx = next.findIndex((s) => s.accountId === accountId);
  if (idx >= 0) {
    const prev = next[idx]!;
    next[idx] = {
      ...prev,
      cooldownUntil,
      lastErrorCode: lastErrorCode ?? prev.lastErrorCode,
      consecutiveFailures: prev.consecutiveFailures + 1,
    };
  } else {
    next.push({
      accountId,
      cooldownUntil,
      lastErrorCode,
      consecutiveFailures: 1,
    });
  }
  return next;
}

function accountById(config: QuotaRouterConfig, id: string): AccountRef | undefined {
  return config.accounts.find((a) => a.id === id);
}

/**
 * Pick the first enabled account in the plan's pool that is not in cooldown.
 * Does not rotate on error — callers use applyCooldown then re-select.
 * Pool exhaustion: when stayInPoolUnlessFallbackEnabled and no fallback used → pool_exhausted.
 */
export function selectAccountForPlan(
  config: QuotaRouterConfig,
  planId: string | undefined,
  states: readonly AccountRuntimeState[],
  nowMs: number,
): SelectAccountResult {
  if (!config.enabled) {
    return { ok: false, code: 'router_disabled', message: 'quota router disabled' };
  }

  const resolvedPlanId = planId ?? config.defaultPlanId;
  if (!resolvedPlanId) {
    return { ok: false, code: 'plan_not_found', message: 'no planId and no defaultPlanId' };
  }

  const plan = config.plans.find((p) => p.id === resolvedPlanId);
  if (!plan) {
    return { ok: false, code: 'plan_not_found', message: `plan not found: ${resolvedPlanId}` };
  }
  if (!plan.enabled) {
    return { ok: false, code: 'plan_disabled', message: `plan disabled: ${plan.id}` };
  }

  const pool = config.pools.find((p) => p.id === plan.poolId);
  if (!pool) {
    return { ok: false, code: 'pool_not_found', message: `pool not found: ${plan.poolId}` };
  }

  const pickFromPool = (poolId: string): SelectAccountResult | null => {
    const p = config.pools.find((x) => x.id === poolId);
    if (!p) {
      return { ok: false, code: 'pool_not_found', message: `pool not found: ${poolId}` };
    }
    for (const accountId of p.accountIds) {
      const account = accountById(config, accountId);
      if (!account) {
        return { ok: false, code: 'account_missing', message: `account missing: ${accountId}` };
      }
      if (!account.enabled) continue;
      if (isInCooldown(states, accountId, nowMs)) continue;
      return {
        ok: true,
        plan,
        pool: p,
        account,
        modelPin: plan.modelPin,
      };
    }
    return null;
  };

  const primary = pickFromPool(pool.id);
  if (primary) return primary;

  const allowFallback =
    !config.stayInPoolUnlessFallbackEnabled ||
    (Array.isArray(plan.fallbackPoolIds) && plan.fallbackPoolIds.length > 0);

  if (allowFallback && plan.fallbackPoolIds?.length) {
    for (const fbId of plan.fallbackPoolIds) {
      const fb = pickFromPool(fbId);
      if (fb) return fb;
    }
  }

  return {
    ok: false,
    code: 'pool_exhausted',
    message: `pool exhausted: ${pool.id} (stayInPoolUnlessFallbackEnabled=${config.stayInPoolUnlessFallbackEnabled})`,
  };
}
