import { describe, it, expect, vi, beforeEach } from "vitest";
import { setInitialBalances } from "./accountsService";
import { createClient } from "@/utils/supabase/client";
import { logAudit } from "@/utils/auditLog";
import { makeMockSupabase } from "@/__tests__/mockSupabase";

vi.mock("@/utils/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/utils/auditLog", () => ({ logAudit: vi.fn() }));

const mockedLogAudit = vi.mocked(logAudit);

function defaults() {
  return {
    cajaAccountId: 1,
    bancoAccountId: 2,
    rappiAccountId: 3,
    cajaBalance: null as number | null,
    bancoBalance: null as number | null,
    rappiBalance: null as number | null,
    cajaPrevious: null,
    bancoPrevious: null,
    rappiPrevious: null,
    userId: "u1",
    userName: "Seba",
  };
}

describe("setInitialBalances", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama adjust_account_balance solo para las cuentas con balance no-null", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setInitialBalances({ ...defaults(), cajaBalance: 100, rappiBalance: 50 });

    const adjustCalls = sb.rpcCalls.filter((c) => c.fn === "adjust_account_balance");
    expect(adjustCalls).toHaveLength(2);
    expect(adjustCalls[0].params).toMatchObject({
      p_account_id: 1,
      p_new_balance: 100,
    });
    expect(adjustCalls[1].params).toMatchObject({
      p_account_id: 3,
      p_new_balance: 50,
    });
  });

  it("audit incluye solo los balances configurados", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setInitialBalances({
      ...defaults(),
      cajaBalance: 100,
      cajaPrevious: 50,
    });

    const auditCall = mockedLogAudit.mock.calls[0]?.[0] as {
      details: Record<string, unknown>;
    };
    expect(auditCall.details.caja).toBe(100);
    expect(auditCall.details.caja_anterior).toBe(50);
    expect(auditCall.details.banco).toBeUndefined();
  });

  it("salta cuentas sin id aunque tengan balance", async () => {
    const sb = makeMockSupabase();
    vi.mocked(createClient).mockReturnValue(sb.client as never);

    await setInitialBalances({
      ...defaults(),
      cajaAccountId: null,
      cajaBalance: 100,
    });

    expect(sb.rpcCalls.filter((c) => c.fn === "adjust_account_balance")).toHaveLength(0);
    expect(mockedLogAudit).toHaveBeenCalled();
  });
});
