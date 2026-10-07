import React, { useState, useMemo } from 'react';
import { X, ArrowRightLeft, TrendingDown, TrendingUp, Calendar, Tag, Wallet, Sparkles, SlidersHorizontal, Calculator } from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { TransactionType, JarType } from '../../types';
import { getTodayStr, formatVND } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { SIX_JARS, getJarInfo, getJarDisplayName } from '../../utils/defaultData';
import { SixJarsConfigModal } from '../budgets/SixJarsConfigModal';
import { evaluateMoneyExpression } from '../../utils/calculator';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const { 
    categories, 
    accounts, 
    addTransaction, 
    userRole,
    household,
    transactions,
    autoAllocateSixJarsBudget,
    adjustBudget
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [type, setType] = useState<TransactionType>('expense');
  const [selectedJarFilter, setSelectedJarFilter] = useState<JarType | 'all'>('all');
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayStr);
  const [note, setNote] = useState<string>('');
  const [incomeBudgetMode, setIncomeBudgetMode] = useState<'split_jars' | 'single_jar' | 'none'>('split_jars');
  const [dedicatedJar, setDedicatedJar] = useState<JarType>('GIVE');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Evaluate math expression in real-time
  const evaluation = useMemo(() => evaluateMoneyExpression(amountInput), [amountInput]);
  const numericAmount = evaluation.result;

  if (!isOpen) return null;

  // Active accounts only (so hidden/inactive accounts don't show when adding new transaction)
  const activeAccounts = accounts.filter(a => a.isActive !== false);
  const selectableAccounts = activeAccounts.length > 0 ? activeAccounts : accounts;

  // Jars configuration
  const jarsConfig = household?.jarsConfig || {
    NEC: 55,
    FFA: 10,
    LTSS: 10,
    EDU: 10,
    PLAY: 10,
    GIVE: 5,
  };
  const jarKeys: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];

  // Filter categories by selected type and jar
  const availableCategories = categories.filter(c => {
    if (c.isArchived) return false;
    if (c.type !== (type === 'income' ? 'income' : 'expense')) return false;
    if (type === 'expense' && selectedJarFilter !== 'all' && c.jar !== selectedJarFilter) {
      return false;
    }
    return true;
  });

  // Default selections if not set
  const currentCategory = categoryId || (availableCategories[0]?.id || '');
  const currentAccount = accountId || (selectableAccounts[0]?.id || '');
  const currentToAccount = toAccountId || (selectableAccounts.length > 1 ? selectableAccounts[1].id : selectableAccounts[0]?.id || '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits, math symbols, spaces, commas, dots, and shortcuts k, tr, m
    const filtered = val.replace(/[^0-9+\-*xX×/÷kKtrTRmMbB,.\s]/g, '');
    setAmountInput(filtered);
  };

  const handleAppendOperator = (op: '+' | '-' | '*' | '/') => {
    const symbol = op === '*' ? ' × ' : op === '/' ? ' ÷ ' : ` ${op} `;
    if (!amountInput.trim()) {
      return;
    }
    const trimmed = amountInput.trim();
    if (/[+\-*/×÷]$/.test(trimmed)) {
      setAmountInput(trimmed.slice(0, -1).trim() + symbol);
    } else {
      setAmountInput(trimmed + symbol);
    }
  };

  const handleEvaluateNow = () => {
    if (evaluation.result > 0) {
      setAmountInput(evaluation.result.toLocaleString('vi-VN'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userRole === 'viewer') {
      showError('Tài khoản của bạn có quyền Người xem (Viewer), không thể tạo giao dịch.');
      return;
    }

    if (numericAmount <= 0) {
      showError('Vui lòng nhập số tiền lớn hơn 0đ.');
      return;
    }

    if (!currentAccount) {
      showError('Vui lòng chọn tài khoản thanh toán.');
      return;
    }

    if (type === 'transfer' && currentAccount === currentToAccount) {
      showError('Tài khoản nguồn và tài khoản đích không được trùng nhau.');
      return;
    }

    setIsSubmitting(true);
    try {
      const txPayload: any = {
        type,
        amount: numericAmount,
        categoryId: type === 'transfer' ? 'transfer' : currentCategory,
        accountId: currentAccount,
        date,
        note: note.trim(),
      };
      if (type === 'transfer' && currentToAccount) {
        txPayload.toAccountId = currentToAccount;
      }

      await addTransaction(txPayload);

      let budgetSyncedMsg = '';
      if (type === 'income') {
        const txMonth = date.slice(0, 7); // YYYY-MM
        if (incomeBudgetMode === 'split_jars') {
          try {
            const existingMonthlyIncome = transactions
              .filter(t => t.type === 'income' && t.date.startsWith(txMonth))
              .reduce((sum, t) => sum + t.amount, 0);
            const newTotalMonthlyIncome = existingMonthlyIncome + numericAmount;
            await autoAllocateSixJarsBudget(txMonth, newTotalMonthlyIncome, jarsConfig);
            budgetSyncedMsg = ' Đã tự động cập nhật phân bổ ngân sách 6 lọ.';
          } catch (budgetErr) {
            console.warn('Could not auto-allocate six jars budget:', budgetErr);
          }
        } else if (incomeBudgetMode === 'single_jar') {
          try {
            await adjustBudget(txMonth, `jar_${dedicatedJar}`, numericAmount, true);
            const targetJarName = getJarDisplayName(dedicatedJar, household?.jarCustomNames);
            budgetSyncedMsg = ` Đã cộng thẳng +${formatVND(numericAmount)} vào ngân sách Lọ ${targetJarName}!`;
          } catch (budgetErr) {
            console.warn('Could not adjust single jar budget:', budgetErr);
          }
        }
      }

      const typeLabel = type === 'expense' ? 'khoản chi' : type === 'income' ? 'khoản thu' : 'khoản chuyển';
      showSuccess(
        `Đã ghi nhận ${typeLabel} ${formatVND(numericAmount)} thành công!${budgetSyncedMsg}`
      );

      // Reset form
      setAmountInput('');
      setNote('');
      setDate(getTodayStr());
      onClose();
    } catch (err) {
      showError('Không thể lưu giao dịch', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
        <div 
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-6 duration-200"
        >
          {/* Mobile Bottom-sheet Pull Indicator */}
          <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="p-3 sm:p-4 pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {/* Transaction Type Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategoryId(''); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Chi</span>
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategoryId(''); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Thu</span>
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  type === 'transfer'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chuyển tiền</span>
                <span className="sm:hidden">Chuyển</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body (Scrollable) */}
          <form onSubmit={handleSubmit} noValidate className="overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-3.5">
            {/* Big Amount Input with Math Calculator */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <div className="flex items-center justify-between mb-0.5 px-0.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Số tiền ({type === 'expense' ? 'Khoản chi' : type === 'income' ? 'Khoản thu' : 'Chuyển đi'})
                </label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                  <Calculator className="w-3 h-3" />
                  Tính cộng/trừ (+, -)
                </span>
              </div>

              <div className="flex items-center justify-center gap-1 my-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  value={amountInput}
                  onChange={handleAmountChange}
                  className="w-full text-center text-3xl sm:text-4xl font-black bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 tracking-tight"
                />
                <span className="text-xl sm:text-2xl font-bold text-slate-400 shrink-0">đ</span>
              </div>

              {/* Live Formula Preview Badge */}
              {evaluation.hasOperator && (
                <div className="flex items-center justify-center gap-1.5 my-1.5 py-1 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium animate-in fade-in">
                  <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate text-[11px]">
                    Tính: <span className="font-bold text-slate-800 dark:text-slate-200">{evaluation.formattedDisplay || amountInput}</span> = <strong className="text-blue-600 dark:text-blue-400 font-black text-xs sm:text-sm">{formatVND(evaluation.result)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleEvaluateNow}
                    className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold active:scale-95 transition shrink-0 shadow-2xs"
                    title="Tính tổng"
                  >
                    = Bằng
                  </button>
                </div>
              )}

              {/* Calculator Toolbar: Math Operators & Shortcuts */}
              <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                {/* Math operators */}
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl gap-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleAppendOperator('+')}
                    className="w-9 h-7 sm:w-11 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-800 dark:text-slate-100 font-black text-sm transition active:scale-95 shadow-2xs"
                    title="Cộng thêm (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendOperator('-')}
                    className="w-9 h-7 sm:w-11 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-800 dark:text-slate-100 font-black text-sm transition active:scale-95 shadow-2xs"
                    title="Trừ bớt (-)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendOperator('*')}
                    className="w-9 h-7 sm:w-11 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 text-slate-800 dark:text-slate-100 font-black text-xs transition active:scale-95 shadow-2xs"
                    title="Nhân (×)"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={handleEvaluateNow}
                    disabled={!evaluation.hasOperator}
                    className="w-9 h-7 sm:w-11 sm:h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white font-black text-sm transition active:scale-95 shadow-2xs"
                    title="Tính kết quả (=)"
                  >
                    =
                  </button>
                </div>

                {/* Number & Unit shortcuts for mobile convenience */}
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl gap-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setAmountInput(prev => prev + '000')}
                    className="px-2 h-7 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition active:scale-95 shadow-2xs"
                    title="Thêm 000"
                  >
                    000
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountInput(prev => prev + 'k')}
                    className="px-2 h-7 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-2xs"
                    title="k (nghìn)"
                  >
                    k
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountInput(prev => prev + 'tr')}
                    className="px-2 h-7 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-2xs"
                    title="tr (triệu)"
                  >
                    tr
                  </button>
                </div>

                {amountInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountInput('')}
                    className="h-7 sm:h-8 px-2.5 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition active:scale-95 flex items-center gap-1 shadow-2xs"
                    title="Xoá trắng"
                  >
                    Xoá
                  </button>
                )}
              </div>
            </div>

            {/* 6 Jars Income Budget Mode Selection */}
            {type === 'income' && (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-3.5 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Phân bổ ngân sách tháng {date.slice(0, 7)}:</span>
                  </div>
                  {incomeBudgetMode === 'split_jars' && (
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(true)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-slate-700 shadow-2xs hover:bg-emerald-50 transition"
                      title="Tùy chỉnh tỷ lệ 6 lọ"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Cài tỷ lệ %</span>
                    </button>
                  )}
                </div>

                {/* 3 Modes Switcher */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/80 dark:border-slate-700 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setIncomeBudgetMode('split_jars')}
                    className={`py-1.5 px-1 rounded-lg text-center transition truncate ${
                      incomeBudgetMode === 'split_jars'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    Chia 6 Lọ (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomeBudgetMode('single_jar')}
                    className={`py-1.5 px-1 rounded-lg text-center transition truncate ${
                      incomeBudgetMode === 'single_jar'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    Dành riêng 1 Lọ 🎯
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomeBudgetMode('none')}
                    className={`py-1.5 px-1 rounded-lg text-center transition truncate ${
                      incomeBudgetMode === 'none'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    Không đổi ngân sách
                  </button>
                </div>

                {/* Mode 1: Split 6 Jars Grid */}
                {incomeBudgetMode === 'split_jars' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {jarKeys.map(key => {
                        const jar = getJarInfo(key, household?.jarCustomNames);
                        const pct = jarsConfig[key] !== undefined ? jarsConfig[key] : jar.percent;
                        const allocated = Math.round((numericAmount * pct) / 100);
                        return (
                          <div
                            key={key}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-emerald-100 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {jar.shortName}
                              </span>
                              <span
                                className="text-[9px] font-bold px-1 py-0.5 rounded-sm text-white"
                                style={{ backgroundColor: jar.color }}
                              >
                                {pct}%
                              </span>
                            </div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                              +{formatVND(allocated)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Tự động tính và cập nhật hạn mức chi tiêu 6 lọ theo tỷ lệ % đã cài đặt.
                    </p>
                  </div>
                )}

                {/* Mode 2: Single Dedicated Jar Selector */}
                {incomeBudgetMode === 'single_jar' && (
                  <div className="space-y-2 bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Chọn Lọ nhận trọn vẹn số tiền này:
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {jarKeys.map(key => {
                        const jar = getJarInfo(key, household?.jarCustomNames);
                        const isSelected = dedicatedJar === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDedicatedJar(key)}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30 font-bold shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full mb-1"
                              style={{ backgroundColor: jar.color }}
                            />
                            <span className="text-[10px] truncate max-w-full">{jar.shortName}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200">
                      🎯 Toàn bộ <strong>+{formatVND(numericAmount)}</strong> sẽ được cộng thẳng vào ngân sách <strong>Lọ {getJarDisplayName(dedicatedJar, household?.jarCustomNames)}</strong> (không bị chia nhỏ sang các lọ khác).
                    </div>
                  </div>
                )}

                {/* Mode 3: None */}
                {incomeBudgetMode === 'none' && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                    ℹ️ Khoản thu sẽ được lưu vào sổ giao dịch và số dư tài khoản. Ngân sách chi tiêu các lọ tháng này giữ nguyên.
                  </div>
                )}
              </div>
            )}

            {/* Categories Grid (for Expense / Income) */}
            {type !== 'transfer' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Danh mục {type === 'expense' ? '(Phân bổ tài chính)' : 'nguồn thu'}</span>
                  </label>
                </div>

                {/* 6 Jars Quick Filter Pills for Expense */}
                {type === 'expense' && (
                  <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedJarFilter('all')}
                      className={`px-2 py-0.5 rounded-lg font-semibold shrink-0 transition ${
                        selectedJarFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Tất cả
                    </button>
                    {(['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'] as JarType[]).map(jarKey => {
                      const jar = getJarInfo(jarKey, household?.jarCustomNames);
                      const isSelected = selectedJarFilter === jarKey;
                      const pct = jarsConfig[jarKey] !== undefined ? jarsConfig[jarKey] : jar.percent;
                      return (
                        <button
                          key={jarKey}
                          type="button"
                          onClick={() => setSelectedJarFilter(jarKey)}
                          className={`px-2 py-0.5 rounded-lg font-semibold shrink-0 flex items-center gap-1 transition ${
                            isSelected
                              ? 'text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                          style={{
                            backgroundColor: isSelected ? jar.color : undefined,
                          }}
                        >
                          <span className="sm:hidden">{jar.code}</span>
                          <span className="hidden sm:inline">{jar.shortName}</span>
                          <span className="opacity-80">({pct}%)</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {availableCategories.map(cat => {
                    const isSelected = currentCategory === cat.id;
                    const jarInfo = cat.jar ? getJarInfo(cat.jar, household?.jarCustomNames) : null;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`flex flex-col items-center justify-start p-2 rounded-xl text-center transition border active:scale-95 relative min-h-[72px] ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {jarInfo && (
                          <span
                            className="absolute top-1 right-1 text-[8px] font-black px-1 py-0.2 rounded-sm text-white shadow-2xs"
                            style={{ backgroundColor: jarInfo.color }}
                            title={jarInfo.name}
                          >
                            {jarInfo.code}
                          </span>
                        )}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center mb-1 text-white shadow-xs mt-0.5 shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconRenderer name={cat.icon} className="w-4 h-4" />
                        </div>
                        <span className="text-[10.5px] sm:text-[11px] font-medium leading-tight text-center line-clamp-2 w-full px-0.5 break-words">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accounts Selector */}
            {type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span>Từ tài khoản</span>
                  </label>
                  <select
                    value={currentAccount}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full text-xs font-medium p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {selectableAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.type === 'debt' ? '(Khoản nợ)' : acc.type === 'card' ? '(Thẻ tín dụng)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span>Đến tài khoản</span>
                  </label>
                  <select
                    value={currentToAccount}
                    onChange={e => setToAccountId(e.target.value)}
                    className="w-full text-xs font-medium p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {selectableAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.type === 'debt' ? '(Khoản nợ - Trả nợ)' : acc.type === 'card' ? '(Thanh toán thẻ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  <span>{type === 'income' ? 'Nhận vào tài khoản' : 'Nguồn tiền / Tài khoản'}</span>
                </label>
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {selectableAccounts.map(acc => {
                    const isSelected = currentAccount === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setAccountId(acc.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition shrink-0 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <IconRenderer name={acc.icon} className="w-3.5 h-3.5" color={acc.color} />
                        <span className="truncate max-w-[120px] sm:max-w-none">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date & Note Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ngày ghi nhận</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-xs font-medium p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Ghi chú (tuỳ chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn trưa phở bò, mua sữa..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={200}
                  className="w-full text-xs font-medium p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Big Action Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || numericAmount <= 0}
                className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98] ${
                  type === 'expense'
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                    : type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                }`}
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : type === 'expense'
                  ? `LƯU KHOẢN CHI ${numericAmount > 0 ? `(${formatVND(numericAmount)})` : ''}`
                  : type === 'income'
                  ? `LƯU KHOẢN THU ${numericAmount > 0 ? `(${formatVND(numericAmount)})` : ''}`
                  : `LƯU CHUYỂN TIỀN ${numericAmount > 0 ? `(${formatVND(numericAmount)})` : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Six Jars Config Modal for quick percentage tuning */}
      <SixJarsConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </>
  );
};
