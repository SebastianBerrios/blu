import { vi, type Mock } from "vitest";

interface Result {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

export interface MockSupabaseDefaults {
  /** Result for chains ending in `.single()` (e.g. select.eq.single, insert.select.single) */
  single?: Result;
  /** Result for chains ending in `.eq(...)` without `.single()` (delete/update finals) */
  eqTerminal?: Result;
  /** Result for terminal `.lte(...)` (e.g. count queries) */
  lte?: Result;
  /** Result for `rpc(name, params)` */
  rpc?: Result;
  /** Result for `auth.getUser()` — defaults to a fake user */
  authUser?: { user: { id: string } | null };
}

export interface InsertCall {
  table: string;
  payload: unknown;
}
export interface UpdateCall {
  table: string;
  payload: unknown;
  filters: Array<[string, unknown]>;
}
export interface DeleteCall {
  table: string;
  filters: Array<[string, unknown]>;
}
export interface SelectCall {
  table: string;
  columns: string;
  options?: unknown;
  filters: Array<[string, unknown]>;
  ordering: Array<{ method: string; args: unknown[] }>;
}
export interface RpcCall {
  fn: string;
  params: unknown;
}

export interface MockSupabase {
  client: { from: Mock; rpc: Mock; auth: { getUser: Mock } };
  from: Mock;
  rpc: Mock;
  // Per-call records
  insertCalls: InsertCall[];
  updateCalls: UpdateCall[];
  deleteCalls: DeleteCall[];
  selectCalls: SelectCall[];
  rpcCalls: RpcCall[];
  // Per-table override of result
  setResult(table: string, result: Result): void;
  setRpcResult(fn: string, result: Result): void;
  /** Override the result of `.update().eq(...).select(...)` for a given table.
   *  Use to simulate RLS rejecting silently (data: []). */
  setUpdateSelectResult(table: string, result: Result): void;
}

/**
 * Builds a chainable mock Supabase client suitable for testing services.
 *
 * Limitations: this is a pragmatic mock that covers the chains used in the
 * codebase (insert/select/single, update/eq, delete/eq[/eq], select/eq/single,
 * select/lte for count, rpc, auth.getUser). It is not a full reimplementation
 * of the Supabase client API.
 */
export function makeMockSupabase(defaults: MockSupabaseDefaults = {}): MockSupabase {
  const insertCalls: InsertCall[] = [];
  const updateCalls: UpdateCall[] = [];
  const deleteCalls: DeleteCall[] = [];
  const selectCalls: SelectCall[] = [];
  const rpcCalls: RpcCall[] = [];

  const tableResults = new Map<string, Result>();
  const rpcResults = new Map<string, Result>();
  const updateSelectResults = new Map<string, Result>();

  const single = defaults.single ?? { data: { id: 1 }, error: null };
  const eqTerminal = defaults.eqTerminal ?? { error: null };
  const lte = defaults.lte ?? { count: 0, error: null };
  const rpcDefault = defaults.rpc ?? { data: null, error: null };
  const authUser = defaults.authUser ?? { user: { id: "test-user-uuid" } };

  function buildSelectChain(table: string, columns: string, options?: unknown) {
    const filters: Array<[string, unknown]> = [];
    const ordering: Array<{ method: string; args: unknown[] }> = [];
    selectCalls.push({ table, columns, options, filters, ordering });

    const tableResult = () => tableResults.get(table) ?? {};

    const chain: Record<string, unknown> = {
      eq: vi.fn((col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      }),
      in: vi.fn((col: string, vals: unknown) => {
        filters.push([col, vals]);
        return chain;
      }),
      lte: vi.fn(async (col: string, val: unknown) => {
        filters.push([col, val]);
        return { ...lte, ...tableResult() };
      }),
      gte: vi.fn((col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      }),
      order: vi.fn((col: string, opts?: unknown) => {
        ordering.push({ method: "order", args: [col, opts] });
        return chain;
      }),
      single: vi.fn(async () => ({ ...single, ...tableResult() })),
      maybeSingle: vi.fn(async () => ({ ...single, ...tableResult() })),
      // Allow `await` on a chain without .single() — resolves to data array
      then: (
        onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
      ) =>
        Promise.resolve({
          data: tableResult().data ?? [],
          error: tableResult().error ?? null,
        }).then(onFulfilled),
    };
    return chain;
  }

  function buildInsertChain(table: string, payload: unknown) {
    insertCalls.push({ table, payload });
    const tableResult = () => tableResults.get(table) ?? {};

    const chain = {
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ ...single, ...tableResult() })),
      })),
      // Direct await on insert (no .select()) — return error/data
      then: (onFulfilled: (v: Result) => unknown) =>
        Promise.resolve({ error: null, ...tableResult() }).then(onFulfilled),
    };
    return chain;
  }

  function buildUpdateChain(table: string, payload: unknown) {
    const filters: Array<[string, unknown]> = [];
    updateCalls.push({ table, payload, filters });
    const tableResult = () => tableResults.get(table) ?? {};

    // `.update().eq().select(...)` chain.
    // - Default: 1 row affected (data: [{id:1}]).
    // - Per-table override via `setUpdateSelectResult` lets tests simulate
    //   RLS rejecting silently (data: []).
    // - Errors set via `eqTerminal` propagate so existing tests that mock
    //   update failures via the eq chain keep working.
    const select = vi.fn(() => {
      const override = updateSelectResults.get(table);
      if (override) return Promise.resolve({ ...eqTerminal, ...override });
      return Promise.resolve({ data: [{ id: 1 }], ...eqTerminal });
    });

    // Same pattern as delete: thenable + .eq for further chaining.
    const eq = vi.fn(function eqFn(col: string, val: unknown) {
      filters.push([col, val]);
      return Object.assign(
        Promise.resolve({ ...eqTerminal, ...tableResult() }),
        { eq: eqFn, select },
      );
    });

    return { eq };
  }

  function buildDeleteChain(table: string) {
    const filters: Array<[string, unknown]> = [];
    deleteCalls.push({ table, filters });
    const tableResult = () => tableResults.get(table) ?? {};

    // eq() returns a thenable that ALSO has its own .eq for further chaining.
    // Important: NOT async, otherwise the first call returns Promise<Promise<...>>.
    const inFn = vi.fn(function inFn(col: string, vals: unknown) {
      filters.push([col, vals]);
      return Object.assign(
        Promise.resolve({ ...eqTerminal, ...tableResult() }),
        { eq: eq, in: inFn },
      );
    });

    const eq = vi.fn(function eqFn(col: string, val: unknown) {
      filters.push([col, val]);
      return Object.assign(
        Promise.resolve({ ...eqTerminal, ...tableResult() }),
        { eq: eqFn, in: inFn },
      );
    });

    return { eq, in: inFn };
  }

  function buildUpsertChain(table: string, payload: unknown) {
    // upsert is recorded in insertCalls so tests can inspect the payload.
    insertCalls.push({ table, payload });
    const tableResult = () => tableResults.get(table) ?? {};
    // Upsert without .select() resolves to { error } directly.
    return {
      then: (onFulfilled: (v: { error: unknown }) => unknown) =>
        Promise.resolve({ error: tableResult().error ?? null }).then(onFulfilled),
    };
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn((columns: string, options?: unknown) =>
      buildSelectChain(table, columns, options),
    ),
    insert: vi.fn((payload: unknown) => buildInsertChain(table, payload)),
    upsert: vi.fn((payload: unknown) => buildUpsertChain(table, payload)),
    update: vi.fn((payload: unknown) => buildUpdateChain(table, payload)),
    delete: vi.fn(() => buildDeleteChain(table)),
  }));

  const rpc = vi.fn(async (fn: string, params: unknown) => {
    rpcCalls.push({ fn, params });
    return { ...rpcDefault, ...(rpcResults.get(fn) ?? {}) };
  });

  const auth = {
    getUser: vi.fn(async () => ({ data: authUser, error: null })),
  };

  return {
    client: { from, rpc, auth },
    from,
    rpc,
    insertCalls,
    updateCalls,
    deleteCalls,
    selectCalls,
    rpcCalls,
    setResult(table, result) {
      tableResults.set(table, result);
    },
    setRpcResult(fn, result) {
      rpcResults.set(fn, result);
    },
    setUpdateSelectResult(table, result) {
      updateSelectResults.set(table, result);
    },
  };
}
