import { Transaction, HouseholdBackupData, Category, Account } from '../types';

/**
 * Exports transactions to CSV file and triggers client-side download
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  householdName: string
) {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const accMap = new Map(accounts.map(a => [a.id, a.name]));

  const headers = ['Ngày', 'Loại', 'Số tiền (VND)', 'Danh mục', 'Tài khoản', 'Tài khoản đích', 'Ghi chú', 'Người tạo'];

  const rows = transactions.map(tx => {
    const typeLabel = tx.type === 'expense' ? 'Chi tiêu' : tx.type === 'income' ? 'Thu nhập' : 'Chuyển khoản';
    const catName = catMap.get(tx.categoryId) || '';
    const accName = accMap.get(tx.accountId) || '';
    const toAccName = tx.toAccountId ? accMap.get(tx.toAccountId) || '' : '';
    const note = (tx.note || '').replace(/"/g, '""');
    const author = tx.createdByName || '';

    return [
      `"${tx.date}"`,
      `"${typeLabel}"`,
      tx.amount,
      `"${catName}"`,
      `"${accName}"`,
      `"${toAccName}"`,
      `"${note}"`,
      `"${author}"`,
    ].join(',');
  });

  // UTF-8 BOM so Excel displays Vietnamese correctly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `sonha_giaodich_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports entire household data as structured JSON backup
 */
export function exportHouseholdBackupJSON(data: HouseholdBackupData) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = (data.household?.name || 'giadinh').toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.download = `sonha_backup_${cleanName}_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Validates imported JSON before proceeding with database restore
 */
export function validateImportedBackup(raw: unknown): {
  valid: boolean;
  error?: string;
  data?: HouseholdBackupData;
  summary?: {
    txCount: number;
    categoriesCount: number;
    accountsCount: number;
    budgetsCount: number;
  };
} {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, error: 'Tệp JSON không đúng định dạng.' };
  }

  const obj = raw as Record<string, any>;
  if (!obj.household || !obj.household.name) {
    return { valid: false, error: 'Thiếu thông tin gia đình trong tệp sao lưu.' };
  }

  if (!Array.isArray(obj.transactions)) {
    return { valid: false, error: 'Danh sách giao dịch không hợp lệ.' };
  }

  const txCount = obj.transactions.length;
  if (txCount > 2000) {
    return {
      valid: false,
      error: `Tệp chứa ${txCount} giao dịch, vượt quá giới hạn an toàn một lần nhập (2.000) trên gói Firebase Spark.`,
    };
  }

  return {
    valid: true,
    data: obj as HouseholdBackupData,
    summary: {
      txCount,
      categoriesCount: Array.isArray(obj.categories) ? obj.categories.length : 0,
      accountsCount: Array.isArray(obj.accounts) ? obj.accounts.length : 0,
      budgetsCount: Array.isArray(obj.budgets) ? obj.budgets.length : 0,
    },
  };
}
