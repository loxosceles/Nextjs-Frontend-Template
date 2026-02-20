/**
 * Project Configuration
 *
 * Project identity constants — the ONLY file setup.sh modifies.
 * Do NOT put bootstrap config here (account, region, domain, certs).
 * Bootstrap config lives in .env.{stage} (local) or CI env vars.
 */
import * as path from 'path';

// ─── Project Identity ────────────────────────────────────────────────────────
// setup.sh replaces __PROJECT_NAME__ at bootstrap time.
export const PROJECT_NAME = '__PROJECT_NAME__';

// ─── Stages ──────────────────────────────────────────────────────────────────
export const SUPPORTED_STAGES = ['dev', 'prod'] as const;
export type Stage = (typeof SUPPORTED_STAGES)[number];

// ─── Paths ───────────────────────────────────────────────────────────────────
export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const FRONTEND_OUT_DIR = path.join(PROJECT_ROOT, 'frontend/out');
