# Verify Report -- permissions-full-control PR1 (Foundation)

> Change: permissions-full-control (Phase 1 -- Foundation / PR1)
> Date: 2026-07-23
> Mode: hybrid (this file + engram sdd/permissions-full-control/verify-report)
> Strict TDD: ACTIVE (runner pnpm test, vitest)
> Verdict: PASS (client/TS side, fully verified) -- HOLD for merge pending DB re-verification.

DB-side live checks (resolver-vs-live-SQL parity, 5 has_permission scenarios, RLS inspection, 1-arg default) were NOT RUN this session: the Supabase execute_sql MCP tool was not reachable by this executor. They are UNVERIFIED, not FAILED.

## Executive Summary

PR1 backend/logic is implemented, TDD was followed, all client-side gates green: 469/469 tests pass, tsc --noEmit clean, lint clean. The pure resolver mirrors the design SQL branch-for-branch. No PR2 leakage (dashboard untouched, permissions alias retained). Spec/tasks require live-DB proof (parity, 5 scenarios, RLS, 1-arg default) which could not be executed here; must run before merge.

## Completeness -- PR1 Tasks (all 14 checked)

| Task | State | Evidence |
|------|-------|----------|
| T1.1-T1.8 DB migration | Reported done live | Table shape reflected in regenerated database.ts; live SQL body / RLS NOT re-verified this run |
| T2.1 database.ts regen | PASS | Tables user_permissions present: user_id/permission/enabled/updated_at/updated_by + FK to user_profiles |
| T3.1 purchases.delete + Compras | PASS | permissions.ts L55-60, PermissionGroup L7 |
| T3.2 Derived PermissionKey | PASS | permissions.ts L61,L64 (as const satisfies, derived from PERMISSION_DEFS) |
| T3.3 UserPermission type | PASS | permissions.ts L5 |
| T3.4 PermissionResolutionCtx | PASS | permissions.ts L66-71 |
| T3.5 Barrel re-export | PASS | via export-star from ./permissions |
| T4.1/T4.2 Resolver + 8 tests | PASS | permissionsResolver.test.ts 8 tests; impl permissionsResolver.ts |
| T5.1/T5.2 set/clearUserPermission + tests | PASS | 11 new tests; impl permissionsService.ts |
| T6.1/T6.2 Hook rewrite + alias | PASS | usePermissions.ts L68 alias, 2nd SWR key L47-51 |
| T7.1/T7.2 Barrel + gate | PASS | features/usuarios/index.ts L3; test/tsc/lint green |

## Build / Test Evidence

| Command | Result |
|---------|--------|
| pnpm test | PASS 469/469 (43 files), 3.31s |
| pnpm tsc --noEmit | PASS exit 0 |
| pnpm lint | PASS exit 0, 0 warnings |

## TDD Compliance

| Check | Result |
|-------|--------|
| TDD evidence in apply-progress (id 147) | PASS |
| All logic tasks have tests | PASS resolver 8 + service 11 |
| RED (test files exist) | PASS |
| GREEN (pass on run) | PASS 469/469 |
| Triangulation | PASS true/false variance across 8 resolver scenarios; service covers table/payload/onConflict/audit/error/null-admin |
| Safety net (modified files) | PASS service suite extended, no regression |

Assertion quality: PASS -- all assertions verify real behavior. No tautologies. toBeDefined() on upsert/deleteCall pairs with payload/filter assertions; rejects.toBeTruthy() pairs with logAudit-not-called. No smoke-only, no ghost loops, no mock-heavy imbalance.

## Spec Compliance Matrix (client/TS scope)

| Requirement | Status | Note |
|---|---|---|
| 4-Branch Resolution Parity (TS) | PASS | 4-branch order + admin pre-lookup + branch-2 existence check, 8 tests green |
| 4-Branch Parity (TS vs live-SQL) | UNVERIFIED | design-SQL matches resolver line-by-line; live SQL not read this run |
| Tri-State Override Encoding | PASS | upsert (set) / delete (clear) split; tests assert both |
| Admin Security Invariant (TS) | PASS | branch 1 pre-lookup; scenario 7 test (admin + force-OFF -> true) |
| Admin Invariant (DB) | UNVERIFIED | needs live has_permission scenario 5 |
| user_permissions RLS | UNVERIFIED | needs pg_policies inspection |
| purchases.delete Visibility | PASS (type) / UNVERIFIED (DB row state) | key in PERMISSION_DEFS+group; role rows not re-queried |
| Type Drift Elimination | PASS | derived union; tsc green |
| Service Error Propagation | PASS | throw-on-error + no-audit tests for both fns |

## Resolver vs SQL Parity (static, against design section 4)

| # | Resolver | SQL (design section 4) | Match |
|---|----------|------------------------|-------|
| 1 | if (ctx.isAdmin) return true | WHEN EXISTS(user_profiles role=admin) THEN true | PASS pre-lookup |
| - | if (!ctx.role) return false | SQL join on role yields no row -> ELSE | PASS equivalent |
| 2 | userPerms.find -> return enabled | WHEN EXISTS(user_permissions) THEN (SELECT enabled) | PASS existence-then-value (force-OFF denies) |
| 3 | rolePerms.find -> return enabled | WHEN EXISTS(role_permissions JOIN) THEN (SELECT enabled) | PASS |
| 4 | return false | ELSE false | PASS default deny |

Static parity is EXACT. Residual risk: live function may differ from design body -- unverified this run.

## No Scope Creep / No PR2 Leakage

- PermissionsTab.tsx NOT in git diff. permissions/ component dir NOT created.
- permissions: rolePerms alias retained in usePermissions (L68) -> PermissionsTab compiles unchanged.
- git diff limited to: types (permissions, auditLog, database), resolver (+test), service (+test), hook, barrel. Matches PR1 scope.

## Issues

### CRITICAL -- UNVERIFIED (blocking merge until run with DB access)
1. Live resolver-vs-SQL parity not confirmed. Could not read pg_get_functiondef(public.has_permission) -- no execute_sql tool available to this executor. Static parity vs design is exact, but the live function body must be diffed before merge.
2. 5 live has_permission scenarios not executed (force-OFF beats role=true; force-ON beats role=false; role default; no rows; admin+force-OFF). Required by spec 4-Branch Resolution Parity + tasks T1.6.
3. RLS on user_permissions not inspected. Cannot confirm SELECT=own-or-admin and INSERT/UPDATE/DELETE=admin-only (self-grant prevention). Required by spec user_permissions RLS.
4. 1-arg has_permission(purchases.delete) default not exercised live. Cannot confirm DEFAULT auth.uid() preserved / 1-arg callers unbroken.

These are UNVERIFIED, not FAILED. No defect evidence found; checks simply could not run this session. Execute via Supabase MCP execute_sql before PR1 merges.

### WARNING
1. No versioned migration file for user_permissions / has_permission. supabase/migrations/ ends at 20260714T05; no user_permissions_and_has_permission SQL file exists in the working tree; supabase/.temp/ is untracked. Tasks T1.1/T1.8 called for supabase migration new + db pull. Schema is live (proven by regenerated database.ts) but NOT captured as a committed migration -- reproducibility gap.

### SUGGESTION
1. Resolver docstring (L7) references a supabase/migrations user_permissions_and_has_permission SQL path that does not exist in-tree. Align once the migration is committed (ties to WARNING 1).
2. purchases.delete DB row state for cocinero/barista (tasks T1.7) should be re-confirmed live before relying on surfacing-is-behavior-neutral.

## Verdict

Client/TS side: PASS. All logic, types, tests, gates green; TDD followed; parity exact against design; no scope creep.

Overall PR1 merge readiness: HOLD -- pending DB re-verification. Four required live-DB checks could not be executed this session (no execute_sql tool). Re-run via Supabase MCP; if all pass and the migration file is committed (WARNING 1), PR1 is mergeable.
