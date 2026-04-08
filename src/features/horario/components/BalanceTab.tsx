import type { ScheduleUser } from "@/types";
import Spinner from "@/components/ui/Spinner";
import AdminBalanceView from "./AdminBalanceView";
import EmployeeBalanceView from "./EmployeeBalanceView";

interface BalanceTabProps {
  balances: {
    user_id: string;
    user_name: string;
    balance: number;
    total_credits: number;
    total_debits: number;
  }[];
  entries: {
    user_id: string;
    user_name: string | null;
    hours: number;
    description: string;
    created_at: string;
  }[];
  users: ScheduleUser[];
  isLoading: boolean;
  isAdmin: boolean;
  myBalance: number;
  userId: string | undefined;
}

export default function BalanceTab({
  balances,
  entries,
  users,
  isLoading,
  isAdmin,
  myBalance,
  userId,
}: BalanceTabProps) {
  return (
    <div className="p-4 md:p-6">
      {isLoading ? (
        <Spinner text="Cargando acumulado..." />
      ) : isAdmin ? (
        <AdminBalanceView balances={balances} entries={entries} users={users} />
      ) : (
        <EmployeeBalanceView
          balance={myBalance}
          entries={entries.filter((e) => e.user_id === userId)}
        />
      )}
    </div>
  );
}
