import { EarningsTable } from "./EarningsTable";

export function MonthlyBreakdownTable() {
  const columns = ["Date", "Total Amount", "Amount Locked", "Amount Paid"];

  // Sample row with dashes for empty state
  const data = [
    { date: "December '25", totalAmount: "–", amountLocked: "–", amountPaid: "–" },
  ];

  return (
    <EarningsTable title="Monthly Breakdown" columns={columns}>
      {data.map((row, idx) => (
        <tr key={idx}>
          <td className="px-4 py-4 text-foreground">{row.date}</td>
          <td className="px-4 py-4 text-foreground">{row.totalAmount}</td>
          <td className="px-4 py-4 text-foreground">{row.amountLocked}</td>
          <td className="px-4 py-4 text-foreground">{row.amountPaid}</td>
        </tr>
      ))}
    </EarningsTable>
  );
}
