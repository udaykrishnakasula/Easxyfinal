import React from "react";
import { ReceiptText } from "lucide-react";
import dayjs from "dayjs";

import { useTransactions, money } from "@/features/dashboard/api";
import { PageHeading, EasyXTable, EasyXStatusBadge, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

export default function TransactionsPage() {
  const { data, isLoading } = useTransactions();
  return (
    <div data-testid="transactions-page">
      <PageHeading title="Transactions" subtitle="Your complete wallet ledger." icon={ReceiptText} />
      {isLoading ? (
        <EasyXLoader />
      ) : !data || data.length === 0 ? (
        <div className="mt-8"><EasyXEmptyState icon={ReceiptText} title="No transactions yet" /></div>
      ) : (
        <div className="mt-5">
          <EasyXTable columns={["Type", "Amount", "Balance after", "Status", "Date"]}>
            {data.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 capitalize text-ex-text">{t.type.replace(/_/g, " ").toLowerCase()}</td>
                <td className={`px-4 py-3 font-semibold ${t.direction === "credit" ? "text-emerald-300" : "text-red-300"}`}>
                  {t.direction === "credit" ? "+" : "-"}{money(t.amount)}
                </td>
                <td className="px-4 py-3 text-ex-text">{money(t.balance_after)}</td>
                <td className="px-4 py-3"><EasyXStatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-ex-muted whitespace-nowrap">{dayjs(t.created_at).format("DD MMM YYYY, HH:mm")}</td>
              </tr>
            ))}
          </EasyXTable>
        </div>
      )}
    </div>
  );
}
