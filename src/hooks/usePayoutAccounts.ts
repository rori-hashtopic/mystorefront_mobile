import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PayoutAccountType = "EFT" | "PAYFAST";
export type PayoutAccountStatus = "inactive" | "active";

export interface PayoutAccount {
  id: string;
  user_id: string;
  type: PayoutAccountType;
  status: PayoutAccountStatus;
  bank_name: string | null;
  account_holder: string | null;
  account_number_masked: string | null;
  account_type: string | null;
  branch_code: string | null;
  merchant_id: string | null;
  passphrase_set: boolean | null;
  signature_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

export function usePayoutAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    // MUST stay an explicit column list. account_number_encrypted is withheld by
    // a column-level grant, and Postgres expands `select *` at parse time — so a
    // star select now fails with "permission denied for table payout_accounts"
    // for every creator, not just for that one column. That would blank the
    // whole Earnings surface while looking like "no payout account linked".
    const { data, error } = await supabase
      .from("payout_accounts")
      .select(
        "id, user_id, type, status, bank_name, account_holder, account_number_masked, account_type, branch_code, merchant_id, passphrase_set, signature_enabled, created_at, updated_at",
      )
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching payout accounts:", error);
    } else {
      setAccounts((data as PayoutAccount[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const getAccountByType = (type: PayoutAccountType): PayoutAccount | undefined => {
    return accounts.find((acc) => acc.type === type);
  };

  const linkEftAccount = async (data: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    accountType: string;
    branchCode: string;
  }) => {
    if (!user) return { error: "Not authenticated" };

    // One RPC writes the row AND the encrypted number in a single transaction.
    // It used to be an upsert here plus a separate encrypt call, which could
    // commit the row and then fail to store the number — leaving an active
    // account whose mask described one bank account and whose ciphertext held
    // another. An admin revealing that gets a valid number for the wrong
    // account and pays it. The client no longer touches either column; the
    // database refuses those writes outright.
    const { error } = await supabase.rpc("save_eft_payout_account" as any, {
      p_bank_name: data.bankName,
      p_account_holder: data.accountHolder,
      p_account_type: data.accountType,
      p_branch_code: data.branchCode,
      p_account_number: data.accountNumber,
    });

    if (error) {
      console.error("Could not save EFT payout account", error);
      return { error };
    }

    await fetchAccounts();
    return { error: null };
  };

  const linkPayfastAccount = async (data: { merchantId: string; merchantKey: string; passphrase?: string }) => {
    if (!user) return { error: "Not authenticated" };

    const maskedMerchantId = `${data.merchantId.slice(0, 2)}${"x".repeat(Math.max(0, data.merchantId.length - 4))}${data.merchantId.slice(-2)}`;

    const { error } = await supabase.from("payout_accounts").upsert(
      {
        user_id: user.id,
        type: "PAYFAST" as PayoutAccountType,
        status: "active" as PayoutAccountStatus,
        merchant_id: maskedMerchantId,
        merchant_key_encrypted: "encrypted", // In production, encrypt this properly
        passphrase_set: !!data.passphrase,
        signature_enabled: true,
      },
      { onConflict: "user_id,type" },
    );

    if (!error) {
      await fetchAccounts();
    }
    return { error };
  };

  const unlinkAccount = async (type: PayoutAccountType) => {
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase.from("payout_accounts").delete().eq("user_id", user.id).eq("type", type);

    if (!error) {
      await fetchAccounts();
    }
    return { error };
  };

  const hasActiveAccount = accounts.some((acc) => acc.status === "active");

  return {
    accounts,
    loading,
    getAccountByType,
    linkEftAccount,
    linkPayfastAccount,
    unlinkAccount,
    hasActiveAccount,
    refetch: fetchAccounts,
  };
}
