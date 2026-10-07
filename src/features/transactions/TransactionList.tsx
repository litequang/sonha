import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ArrowRightLeft, 
  Plus, 
  Calendar,
  X,
  User as UserIcon,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Wallet,
  Tag,
  Calculator
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { Transaction, TransactionType } from '../../types';
import { formatVND, formatFriendlyDate, getPreviousMonthStr } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { evaluateMoneyExpression } from '../../utils/calculator';

interface TransactionListProps {
  onOpenQuickAdd: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ onOpenQuickAdd }) => {
  const { 
    transactions, 
    categories, 
    accounts, 
    members, 
    updateTransaction, 
    deleteTransaction, 
    currentMonth,
    setCurrentMonth,
    userRole
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmountInput, setEditAmountInput] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const editEvaluation = useMemo(() => evaluateMoneyExpression(editAmountInput), [editAmountInput]);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Type filter
      if (filterType !== 'all' && tx.type !== filterType) return false;

      // Category filter
      if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;

      // Account filter
      if (filterAccount !== 'all' && tx.accountId !== filterAccount && tx.toAccountId !== filterAccount) {
        return false;
      }

      // Member filter
      if (filterMember !== 'all' && tx.createdBy !== filterMember) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(term);
        const amountMatch = String(tx.amount).includes(term);
        const cat = categories.find(c => c.id === tx.categoryId);
        const catMatch = cat?.name.toLowerCase().includes(term);
        if (!noteMatch && !amountMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, filterType, filterCategory, filterAccount, filterMember, searchTerm, categories]);

  // Group by date: { '2026-10-03': [tx1, tx2], ... }
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach(tx => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });

    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể xóa giao dịch.');
      return;
    }
    try {
      await deleteTransaction(id);
      showSuccess('Đã xóa giao dịch.');
      setShowDeleteConfirm(null);
      setEditingTx(null);
    } catch (err) {
      showError('Không thể xóa giao dịch', err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể chỉnh sửa giao dịch.');
      return;
    }

    try {
      const finalAmount = editEvaluation.result > 0 ? editEvaluation.result : editingTx.amount;
      if (finalAmount <= 0) {
        showError('Vui lòng nhập số tiền lớn hơn 0đ.');
        return;
      }
      await updateTransaction(editingTx.id, {
        amount: Math.round(Math.abs(finalAmount)),
        categoryId: editingTx.categoryId,
        accountId: editingTx.accountId,
        date: editingTx.date,
        note: editingTx.note.trim(),
      });
      showSuccess('Đã cập nhật giao dịch.');
      setEditingTx(null);
    } catch (err) {
      showError('Không thể cập nhật giao dịch', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3 pb-24 animate-in fade-in duration-200">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo ghi chú, danh mục, số tiền..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {/* Type filters */}
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition text-xs ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium shrink-0 transition text-xs ${
              filterType === 'expense'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
            title="Lọc các khoản chi"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Chi</span>
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium shrink-0 transition text-xs ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
            title="Lọc các khoản thu"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Thu</span>
          </button>
          <button
            onClick={() => setFilterType('transfer')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium shrink-0 transition text-xs ${
              filterType === 'transfer'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
            }`}
            title="Lọc chuyển khoản"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Chuyển</span>
          </button>

          {/* Account Filter dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium border-0 focus:ring-0 max-w-[120px] truncate"
            >
              <option value="all">Tất cả tài khoản</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium border-0 focus:ring-0 max-w-[120px] truncate"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List Grouped by Day */}
      {groupedTransactions.length > 0 ? (
        <div className="space-y-3">
          {groupedTransactions.map(([dateKey, items]) => {
            // Day total expense
            const dayExpense = items.reduce(
              (sum, t) => sum + (t.type === 'expense' ? t.amount : 0),
              0
            );
            const dayIncome = items.reduce(
              (sum, t) => sum + (t.type === 'income' ? t.amount : 0),
              0
            );

            return (
              <div
                key={dateKey}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Date Group Header */}
                <div className="bg-slate-50/80 dark:bg-slate-800 px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatFriendlyDate(dateKey)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {dayExpense > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        -{formatVND(dayExpense)}
                      </span>
                    )}
                    {dayIncome > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatVND(dayIncome)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items in Day */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map(tx => {
                    const cat = categories.find(c => c.id === tx.categoryId);
                    const acc = accounts.find(a => a.id === tx.accountId);
                    const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : null;

                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setEditingTx(tx);
                          setEditAmountInput(tx.amount.toLocaleString('vi-VN'));
                        }}
                        className="w-full px-3 sm:px-3.5 py-2.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{
                              backgroundColor:
                                tx.type === 'transfer' ? '#3B82F6' : cat?.color || '#94A3B8',
                            }}
                          >
                            <IconRenderer
                              name={tx.type === 'transfer' ? 'ArrowRightLeft' : cat?.icon || 'HelpCircle'}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tx.type === 'transfer'
                                ? `Chuyển sang ${toAcc?.name || 'Tài khoản đích'}`
                                : tx.note || cat?.name || 'Giao dịch'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {cat?.name} • {acc?.name}
                              {tx.createdByName && ` • ${tx.createdByName}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`text-xs font-black ${
                              tx.type === 'expense'
                                ? 'text-rose-600 dark:text-rose-400'
                                : tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                            {formatVND(tx.amount)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Load Previous Month Button */}
          <div className="pt-2 text-center">
            <button
              onClick={() => setCurrentMonth(getPreviousMonthStr(currentMonth))}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-xs"
            >
              Xem các giao dịch tháng trước
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Không tìm thấy giao dịch nào
          </p>
          <p className="text-xs text-slate-400 mb-4">
            {searchTerm
              ? 'Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.'
              : 'Hãy bắt đầu ghi lại các khoản thu chi đầu tiên của gia đình.'}
          </p>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            + Thêm khoản chi tiêu mới
          </button>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Chỉnh sửa giao dịch</span>
              </h3>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} noValidate className="mt-4 space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-300">
                    Số tiền (VND)
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                    <Calculator className="w-3 h-3" />
                    Tính cộng/trừ (+, -)
                  </span>
                </div>
                <input
                  type="text"
                  value={editAmountInput}
                  onChange={e => {
                    const filtered = e.target.value.replace(/[^0-9+\-*xX×/÷kKtrTRmMbB,.\s]/g, '');
                    setEditAmountInput(filtered);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-base text-slate-900 dark:text-white"
                />

                {/* Live Formula Preview Badge */}
                {editEvaluation.hasOperator && (
                  <div className="flex items-center justify-between gap-1 mt-1.5 py-1 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-medium animate-in fade-in">
                    <span className="truncate">
                      Tính: <strong>{editEvaluation.formattedDisplay || editAmountInput}</strong> = <strong className="text-blue-600 dark:text-blue-400 font-bold">{formatVND(editEvaluation.result)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditAmountInput(editEvaluation.result.toLocaleString('vi-VN'))}
                      className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold shrink-0"
                    >
                      = Bằng
                    </button>
                  </div>
                )}

                {/* Mini operator buttons */}
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = editAmountInput.trim();
                      if (trimmed) setEditAmountInput(trimmed + ' + ');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 hover:text-blue-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95"
                  >
                    + Cộng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = editAmountInput.trim();
                      if (trimmed) setEditAmountInput(trimmed + ' - ');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95"
                  >
                    - Trừ
                  </button>
                  {editAmountInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditAmountInput('')}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
                    >
                      Xoá
                    </button>
                  )}
                </div>
              </div>

              {editingTx.type !== 'transfer' && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={editingTx.categoryId}
                    onChange={e => setEditingTx({ ...editingTx, categoryId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {categories
                      .filter(c => c.type === editingTx.type)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tài khoản thanh toán
                </label>
                <select
                  value={editingTx.accountId}
                  onChange={e => setEditingTx({ ...editingTx, accountId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {accounts
                    .filter(acc => acc.isActive !== false || acc.id === editingTx.accountId)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Ngày
                </label>
                <input
                  type="date"
                  value={editingTx.date}
                  onChange={e => setEditingTx({ ...editingTx, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={editingTx.note}
                  onChange={e => setEditingTx({ ...editingTx, note: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(editingTx.id)}
                  className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Xoá giao dịch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Xác nhận xoá?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Hành động này sẽ xoá vĩnh viễn giao dịch khỏi sổ chi tiêu của gia đình.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
              >
                Không xoá
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
