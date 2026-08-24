import { EarningsTable, TableEmptyRow } from "./EarningsTable";

export function ShopperReferralTable() {
  const columns = ["Date", "Bonus", "Amount", "Status"];

  // These would come from real data
  const totalEarned = "R0";
  const currentBonus = "R10";

  return (
    <EarningsTable
      title="Shopper Referral Bonuses"
      helperText={`You've earned ${totalEarned} through shopper referrals and are currently earning ${currentBonus} for each new shopper referral.`}
      columns={columns}
    >
      <TableEmptyRow
        colSpan={4}
        message={`You can earn ${currentBonus} for each shopper referral.`}
      />
    </EarningsTable>
  );
}
