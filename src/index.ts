// SPDX-License-Identifier: MIT
/**
 * agent-quota-router — pure helpers + types (M0).
 * Assembly: see docs/assembly.md. No HTTP. No plaintext keys.
 */
export type {
  AccountPool,
  AccountRef,
  AccountRuntimeState,
  ModelPin,
  Plan,
  Provider,
  ProviderId,
  QuotaRouterConfig,
  RotateSignal,
  SelectAccountErr,
  SelectAccountOk,
  SelectAccountResult,
} from './types.js';

export { applyCooldown, isInCooldown, selectAccountForPlan } from './select.js';
