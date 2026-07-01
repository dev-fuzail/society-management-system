import { getAuthData } from "@/hooks/helperHooks";
import { EXPO_PUBLIC_API_BASE as API_BASE_URL } from "@/constants";

export interface WalletTransaction {
  _id: string;
  type: "credit" | "debit" | "platform_fee";
  amount: number;
  title?: string;
  reference_type: "invoice" | "withdrawal" | "manual";
  status: string;
  created_at: string;
  created_by?: { name: string };
}

export interface WalletReport {
  wallet: { _id: string; balance: number; currency: string };
  transactions: WalletTransaction[];
  summary: {
    total_credits: number;
    total_debits: number;
    credit_count: number;
    debit_count: number;
  };
}

const authHeaders = async () => {
  const { token } = await getAuthData();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
};

export const apiGetWalletReport = async (societyId: string): Promise<{ success: boolean; result: WalletReport }> => {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/payments/wallets/${societyId}/report`, { headers });
  return res.json();
};

export const apiAddManualEntry = async (
  societyId: string,
  payload: { type: "credit" | "debit"; amount: number; title: string }
): Promise<{ success: boolean; message: string; result?: { transaction: WalletTransaction; wallet: { balance: number } } }> => {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/payments/wallets/${societyId}/manual-entry`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
};
