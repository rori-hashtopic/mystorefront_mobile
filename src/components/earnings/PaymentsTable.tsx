import { EarningsTable, TableEmptyRow } from "./EarningsTable";
import { usePayoutAccounts } from "@/hooks/usePayoutAccounts";

export function PaymentsTable() {
  const { hasActiveAccount, loading } = usePayoutAccounts();
  const columns = ["Sent On", "Amount", "Source"];

  // In the future, this would fetch actual payments data
  const payments: any[] = [];

  return (
    <EarningsTable title="Payments" columns={columns}>
      {loading ? (
        <TableEmptyRow colSpan={3} message="Loading..." />
      ) : !hasActiveAccount ? (
        <TableEmptyRow
          colSpan={3}
          message="Please link an account below to enable payments."
        />
      ) : payments.length === 0 ? (
        <TableEmptyRow
          colSpan={3}
          message="No payments yet. Payments will appear here once processed."
        />
      ) : (
        payments.map((payment) => (
          <tr key={payment.id} className="border-b">
            <td className="px-4 py-4 text-foreground">{payment.sentOn}</td>
            <td className="px-4 py-4 text-foreground">{payment.amount}</td>
            <td className="px-4 py-4 text-foreground">{payment.source}</td>
          </tr>
        ))
      )}
    </EarningsTable>
  );
}
