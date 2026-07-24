# Exploration: atomic-integrity

> Artifact store: hybrid. Engram `sdd/atomic-integrity/explore` (id 173). Date: 2026-07-24.
> Fixes 4 data-integrity gaps from the 2026-07-24 module review.

## Confirmed conventions (from live pg_get_functiondef)
Atomic RPCs: `LANGUAGE plpgsql SECURITY DEFINER`, `SET search_path TO 'public','pg_temp'`, params `p_*`, Spanish `RAISE EXCEPTION`, `p_user_id uuid DEFAULT auth.uid()`, `v_user_id := COALESCE(auth.uid(), p_user_id)`. Two permission models:
- `has_permission(perm, user)` — admin → user override → role default → deny (used by delete_sale_atomic).
- **owner+día RLS** — `admin OR (owner AND date AT TIME ZONE 'America/Lima' = today)` (used by update_purchase_atomic, delete_sale_transactions). **`update_sale_atomic` MUST use owner+día**, not has_permission, to preserve the non-admin same-day sale edits (RLS relaxation 2026-05-06).

`transactions`: `reference_id` + `reference_type`; direct INSERT blocked; money moves only via `replace_*_transactions` (revert prior → subtract balance → insert → re-add; validates payment sum vs total−discount−commission and account type↔method).

## Item 1 — updateSale not atomic (salesService.ts ~309-480)
Current client sequence (any mid-step failure → partial state): compute discount/net/commission → resolveCustomerId → SELECT existing sale → UPDATE sales header (RLS owner+día fires here) → remove delivered products via `delete_delivered_sale_product` (ADMIN-ONLY, reverses entrega→reverso_entrega inventory) → DELETE pending sale_products → INSERT new pending rows → conditionally `replace_sale_transactions`. Audit is fire-and-forget after.
**Template:** create_sale_atomic (customer upsert, loyalty/price/unit_cost validation PRICE_TOLERANCE=0.01, insert sale+products, calls replace_sale_transactions) + update_purchase_atomic (structural: guard → reverse → update header → replace items → replace transactions → reapply).
**Proposed `update_sale_atomic(p_sale_id bigint, p_payload jsonb, p_user_id uuid DEFAULT auth.uid())`:** owner+día guard inside → customer upsert → loyalty/price validation → UPDATE header (+server commission) → delivered-removal (KEEP admin-only for that sub-op: raise if non-admin removes a delivered row + reverse its entrega movements) → DELETE pending + INSERT new → PERFORM replace_sale_transactions. REVOKE anon/PUBLIC, GRANT authenticated. Callable by any auth (owner+día inside). Client keeps logAudit after success.

## Item 2 — createExtraShift/markAbsence not atomic (scheduleOverridesService.ts L61,219)
Each: INSERT schedule_overrides RETURNING id → INSERT extra_hours_log (reference_id=override.id); on hours error → manual DELETE. Crash between = orphan override / desynced hours ledger. markAbsence dup-check is a non-locking read (race).
**Template:** approve_time_off_request (SECURITY DEFINER, admin check, inserts override+extra_hours_log atomically).
**Proposed (two RPCs):** `create_extra_shift_atomic(p_user_id, p_date, p_start, p_end, p_description, p_admin_id DEFAULT auth.uid()) RETURNS bigint` and `mark_absence_atomic(p_user_id, p_date, p_missed_start, p_missed_end, p_is_day_off, p_hours, p_reason, p_description, p_admin_id DEFAULT auth.uid()) RETURNS bigint`. Both: admin check + `p_admin_id = auth.uid()` guard, INSERT override RETURNING id + INSERT extra_hours_log in one body (auto-rollback removes manual cleanup). mark_absence does the dup-check with a row lock inside. REVOKE anon/PUBLIC, GRANT authenticated. Hours ledger, no cash → MEDIUM risk.

## Item 3 — rejectTimeOffRequest no status guard (timeOffRequestsService.ts:62)
Bare UPDATE status='rechazado' with no `.eq('status','pendiente')` / no affected-row check → an approved request can be re-rejected while its debited hours + override remain. **Fix (client, no RPC):** `.eq('id',id).eq('status','pendiente').select('id')`; throw "La solicitud ya fue procesada" if 0 rows. Must only block; must NOT reverse an approval's side-effects.

## Item 4 — admin self-guards (UsersTab.tsx + usersService.ts)
`setUserRole`/`toggleUserActive` are direct updates with no self-check. `trg_guard_profile_privileged_cols` blocks non-admins but NOT an admin editing themselves → admin can self-demote/self-deactivate → zero-admin lockout. **Fix (client checks):** block when `targetUser.id === currentUser.id` for role→non-admin and for deactivate; toasts "No puedes cambiar tu propio rol" / "No puedes desactivarte a ti mismo". DB guard optional defense-in-depth (scope strictly to self demote/deactivate; risks lockout recovery if broader).

## Slicing (chained, stacked-to-main)
| Slice | Scope | Risk | Ledger/cash | security-auditor |
|---|---|---|---|---|
| **A** | rejectTimeOffRequest guard + admin self-guards (client only) | LOW, no migration | none | No |
| **B** | create_extra_shift_atomic + mark_absence_atomic RPCs + service rewrites | MEDIUM, migration | hours ledger | Recommended |
| **C** | update_sale_atomic RPC + updateSale rewrite | HIGH, migration | cash+balance+inventory | **Required** |

## Risks
1. update_sale_atomic fidelity: delivered-product inventory reversal (keep admin-only sub-op), transaction idempotency, loyalty/price/unit_cost validation, commission recompute, and owner+día gate (NOT has_permission — don't break non-admin same-day edits).
2. Reject: block only, never reverse an approval.
3. Self-guard: still allow editing OTHER admins; only self blocked.
4. Schedule RPCs: move markAbsence dup-check inside with a lock.
