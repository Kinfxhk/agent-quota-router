// SPDX-License-Identifier: MIT
/** QuotaRouterConfig v0 types — credential refs only, never plaintext keys. */

export type ProviderId = string;

export interface Provider {
  id: ProviderId;
  displayName: string;
  routeHint?: string;
}

export interface AccountRef {
  id: string;
  providerId: ProviderId;
  /** Host credentials system ref name — not a key body. */
  credentialRef: string;
  label?: string;
  enabled: boolean;
  defaultModelId?: string;
}

export type RotateSignal =
  | { type: 'llm_error_code'; code: string }
  | { type: 'http_status'; status: number }
  | { type: 'message_regex'; pattern: string };

export interface AccountPool {
  id: string;
  providerId: ProviderId;
  accountIds: string[];
  currentAccountId?: string;
  cooldownMs: number;
  rotateOn: RotateSignal[];
}

export interface ModelPin {
  providerId: ProviderId;
  modelId: string;
}

export interface Plan {
  id: string;
  displayName: string;
  poolId: string;
  modelPin: ModelPin;
  fallbackPoolIds?: string[];
  llmFallbackChainId?: string;
  enabled: boolean;
}

export interface QuotaRouterConfig {
  version: 0;
  enabled: boolean;
  providers: Provider[];
  accounts: AccountRef[];
  pools: AccountPool[];
  plans: Plan[];
  defaultPlanId?: string;
  defaultCooldownMs: number;
  stayInPoolUnlessFallbackEnabled: boolean;
}

export interface AccountRuntimeState {
  accountId: string;
  cooldownUntil?: number;
  lastErrorCode?: string;
  consecutiveFailures: number;
}

export type SelectAccountOk = {
  ok: true;
  plan: Plan;
  pool: AccountPool;
  account: AccountRef;
  modelPin: ModelPin;
};

export type SelectAccountErr = {
  ok: false;
  code:
    | 'router_disabled'
    | 'plan_not_found'
    | 'plan_disabled'
    | 'pool_not_found'
    | 'pool_exhausted'
    | 'account_missing';
  message: string;
};

export type SelectAccountResult = SelectAccountOk | SelectAccountErr;
