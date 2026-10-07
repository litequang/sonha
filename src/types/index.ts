export type MemberRole = 'owner' | 'member' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  currentHouseholdId?: string | null;
  householdIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  jarsConfig?: Record<JarType, number>;
  jarCustomNames?: Record<JarType, string>;
  rolloverBudgetEnabled?: boolean;
}

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  role: MemberRole;
  joinedAt: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Integer in VND (e.g. 150000 = 150.000đ)
  categoryId: string;
  accountId: string;
  toAccountId?: string; // Only for transfer
  date: string; // YYYY-MM-DD
  note: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  clientCreatedAt?: string;
  clientUpdatedAt?: string;
}

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'card' | 'debt' | 'asset' | 'other';

export interface AssetMetadata {
  assetType: 'gold' | 'currency' | 'stock' | 'real_estate' | 'crypto' | 'other';
  unit: string; // e.g. 'chỉ', 'lượng', 'cây', 'USD'
  quantity: number; // e.g. 2.5
  unitPrice: number; // e.g. 85000000 (đ/đơn vị)
  updatedAt?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  isActive: boolean;
  icon: string;
  color: string;
  order?: number;
  assetMetadata?: AssetMetadata;
  createdAt: string;
}

export type JarType = 'NEC' | 'FFA' | 'LTSS' | 'EDU' | 'PLAY' | 'GIVE';

export interface JarInfo {
  code: JarType;
  name: string;
  shortName: string;
  percent: number; // e.g. 55, 10, 10, 10, 10, 5
  color: string;
  icon: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  jar?: JarType;
  isArchived: boolean;
  isDefault: boolean;
  createdAt?: string;
}

export interface Budget {
  id: string; // usually `${month}_${categoryId}`
  month: string; // YYYY-MM
  categoryId: string; // 'overall' or specific categoryId
  amount: number;
  rolloverAmount?: number;
  createdAt: string;
}

export interface BudgetRolloverInfo {
  categoryId: string;
  month: string;
  prevAllocated: number;
  prevSpent: number;
  rolloverAmount: number; // positive = surplus, negative = deficit
  currentAllocated: number;
  effectiveBudget: number; // currentAllocated + (rolloverEnabled ? rolloverAmount : 0)
  currentSpent: number;
  remainingAmount: number;
  percentUsed: number;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextDueDate: string; // YYYY-MM-DD
  lastProcessedDate?: string;
  active: boolean;
  createdAt: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
  isDebt?: boolean; // true = Kế hoạch trả nợ / tất toán nợ, false/undefined = Mục tiêu tiết kiệm
  createdAt: string;
}

export interface HouseholdInvite {
  id: string;
  email: string;
  role: 'member' | 'viewer';
  createdBy: string;
  createdAt: string;
  used: boolean;
  multiUse?: boolean;
  usedCount?: number;
  lastUsedAt?: string;
  expiresAt: string;
}

export interface EmailInvite {
  id: string;
  token: string;
  householdId: string;
  householdName: string;
  email: string;
  role: 'member' | 'viewer';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  used: boolean;
  expiresAt: string;
}

export interface HouseholdBackupData {
  version: string;
  exportedAt: string;
  household: Household;
  members: Member[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
  goals: SavingGoal[];
}
