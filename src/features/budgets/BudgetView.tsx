import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  Edit2,
  X,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { calculateCategoryBreakdown, calculateMonthlySummary, calculateSixJarsBreakdown } from '../../utils/calculations';
import { formatVND, formatMonthYear } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { SIX_JARS, getJarInfo, getJarDisplayName } from '../../utils/defaultData';
import { JarType } from '../../types';
import { SixJarsConfigModal } from './SixJarsConfigModal';

export const BudgetView: React.FC = () => {
  const { 
    household,
    transactions, 
    categories, 
    budgets, 
    allBudgets,
    budgetRollovers,
    currentMonth, 
    saveBudget,
    adjustBudget,
    deleteBudget,
    updateHouseholdSettings,
    userRole 
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [budgetTab, setBudgetTab] = useState<'six_jars' | 'categories'>('six_jars');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSixJarsConfigOpen, setIsSixJarsConfigOpen] = useState(false);
  const [sixJarsInitialTab, setSixJarsInitialTab] = useState<'allocate' | 'config' | 'names'>('allocate');
  const [selectedCatId, setSelectedCatId] = useState<string>('overall');
  const [amountStr, setAmountStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedJar, setExpandedJar] = useState<JarType | null>(null);

  // Quick Add / Adjust single budget modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetId, setAdjustTargetId] = useState<string>('overall');
  const [adjustDeltaStr, setAdjustDeltaStr] = useState<string>('');
  const [adjustSyncOverall, setAdjustSyncOverall] = useState<boolean>(true);
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const summary = calculateMonthlySummary(transactions, budgets);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, categories, budgets);
  const sixJarsBreakdown = useMemo(
    () => calculateSixJarsBreakdown(transactions, categories, summary.income, household?.jarsConfig, household?.jarCustomNames),
    [transactions, categories, summary.income, household?.jarsConfig, household?.jarCustomNames]
  );

  const expenseCategories = categories.filter(c => !c.isArchived && c.type === 'expense');

  // Overall budget doc
  const overallBudget = budgets.find(b => b.categoryId === 'overall');

  // Detailed categories budget stats
  const detailedBudgets = useMemo(
    () => budgets.filter(b => b.categoryId !== 'overall' && !b.categoryId.startsWith('jar_')),
    [budgets]
  );
  const totalDetailedAllocated = useMemo(
    () => detailedBudgets.reduce((sum, b) => sum + b.amount, 0),
    [detailedBudgets]
  );
  const detailedBudgetsCount = detailedBudgets.length;
  const unallocatedDetailedAmount = overallBudget && overallBudget.amount > 0
    ? Math.max(0, overallBudget.amount - totalDetailedAllocated)
    : 0;
  const totalDetailedAllocatedPct = overallBudget && overallBudget.amount > 0
    ? Math.round((totalDetailedAllocated / overallBudget.amount) * 100)
    : 0;

  const handleOpenModal = (catId: string = 'overall') => {
    setSelectedCatId(catId);
    const existing = budgets.find(b => b.categoryId === catId);
    setAmountStr(existing ? String(existing.amount) : '');
    setIsModalOpen(true);
  };

  const handleOpenAdjustModal = (targetId: string = 'overall') => {
    setAdjustTargetId(targetId);
    setAdjustDeltaStr('');
    setAdjustSyncOverall(true);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể điều chỉnh ngân sách.');
      return;
    }
    const delta = parseInt(adjustDeltaStr.replace(/\D/g, ''), 10);
    if (!delta || delta <= 0) {
      showError('Vui lòng nhập số tiền muốn cộng thêm lớn hơn 0đ.');
      return;
    }

    setIsAdjusting(true);
    try {
      await adjustBudget(currentMonth, adjustTargetId, delta, adjustSyncOverall);
      const targetLabel = adjustTargetId.startsWith('jar_')
        ? `Lọ ${getJarDisplayName(adjustTargetId.replace('jar_', '') as JarType, household?.jarCustomNames)}`
        : adjustTargetId === 'overall'
        ? 'Ngân sách tổng'
        : categories.find(c => c.id === adjustTargetId)?.name || 'Mục này';
      showSuccess(`Đã cộng thêm ${formatVND(delta)} vào ${targetLabel}!`);
      setIsAdjustModalOpen(false);
    } catch (err) {
      showError('Không thể tăng ngân sách', err instanceof Error ? err.message : String(err));
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleToggleRollover = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể đổi cài đặt.');
      return;
    }
    const current = household?.rolloverBudgetEnabled !== false;
    try {
      await updateHouseholdSettings({ rolloverBudgetEnabled: !current });
      showSuccess(!current ? 'Đã bật dồn ngân sách thừa/thiếu sang tháng sau!' : 'Đã tắt tính năng dồn ngân sách.');
    } catch (err) {
      showError('Lỗi cập nhật cài đặt', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thay đổi ngân sách.');
      return;
    }

    const num = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!num || num <= 0) {
      showError('Vui lòng nhập hạn mức lớn hơn 0đ.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBudget(currentMonth, selectedCatId, num);
      showSuccess(`Đã lưu ngân sách ${formatVND(num)} cho ${formatMonthYear(currentMonth)}`);
      setIsModalOpen(false);
    } catch (err) {
      showError('Lỗi cập nhật ngân sách', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (catId: string) => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể xóa ngân sách.');
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteBudget(currentMonth, catId);
      showSuccess('Đã hủy hạn mức ngân sách.');
      setIsModalOpen(false);
    } catch (err) {
      showError('Lỗi xóa ngân sách', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) {
      return {
        label: 'Vượt hạn mức',
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
        barColor: 'bg-rose-500',
        icon: XCircle,
      };
    }
    if (percent >= 90) {
      return {
        label: 'Cảnh báo',
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
        barColor: 'bg-rose-500',
        icon: AlertTriangle,
      };
    }
    if (percent >= 70) {
      return {
        label: 'Chú ý',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
        barColor: 'bg-amber-500',
        icon: AlertCircle,
      };
    }
    return {
      label: 'Bình thường',
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      barColor: 'bg-emerald-500',
      icon: CheckCircle2,
    };
  };

  // Helper to get budget for a specific jar
  const getJarBudget = (jarKey: JarType): number => {
    // 1. Direct jar budget doc: 'jar_' + jarKey
    const directDoc = budgets.find(b => b.categoryId === `jar_${jarKey}`);
    if (directDoc && directDoc.amount > 0) return directDoc.amount;

    // 2. Or sum of subcategory budgets belonging to this jar
    const catsInJar = expenseCategories.filter(c => c.jar === jarKey).map(c => c.id);
    const sumCatBudgets = budgets
      .filter(b => catsInJar.includes(b.categoryId))
      .reduce((sum, b) => sum + b.amount, 0);

    if (sumCatBudgets > 0) return sumCatBudgets;

    // 3. Or derived from overall budget using jar percentage
    if (overallBudget && overallBudget.amount > 0) {
      const pct = household?.jarsConfig?.[jarKey] || SIX_JARS[jarKey].percent;
      return Math.round((overallBudget.amount * pct) / 100);
    }

    return 0;
  };

  interface ParentBudgetContext {
    type: 'overall' | 'jar' | 'category';
    parentName: string;
    totalCategoryBudget: number;
    allOtherDetailedBudgets: number;
    remainingFromTotal: number;
    hasGroup: boolean;
    groupName?: string;
    groupBudget?: number;
    siblingInGroupAllocated?: number;
    remainingFromGroup?: number;
    parentBudget: number;
    alreadyAllocated: number;
    maxAllocatable: number;
    limitingReason: 'total' | 'group' | 'none';
    parentKey?: string;
  }

  const getParentBudgetContext = (catId: string): ParentBudgetContext => {
    const totalCategoryBudget = overallBudget?.amount || 0;

    // 1. Overall budget
    if (catId === 'overall') {
      return {
        type: 'overall',
        parentName: 'Toàn gia đình',
        totalCategoryBudget,
        allOtherDetailedBudgets: 0,
        remainingFromTotal: Infinity,
        hasGroup: false,
        parentBudget: 0,
        alreadyAllocated: 0,
        maxAllocatable: Infinity,
        limitingReason: 'none',
      };
    }

    // 2. Direct Jar budget
    if (catId.startsWith('jar_')) {
      const jarKey = catId.replace('jar_', '') as JarType;
      const otherJarsAllocated = (['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'] as JarType[])
        .filter(k => k !== jarKey)
        .reduce((sum, k) => {
          const b = budgets.find(x => x.categoryId === `jar_${k}`);
          return sum + (b?.amount || 0);
        }, 0);

      const maxAllocatable = totalCategoryBudget > 0 ? Math.max(0, totalCategoryBudget - otherJarsAllocated) : Infinity;

      const jarDisplayName = getJarDisplayName(jarKey, household?.jarCustomNames);
      return {
        type: 'jar',
        parentName: 'Ngân sách tổng tháng',
        totalCategoryBudget,
        allOtherDetailedBudgets: otherJarsAllocated,
        remainingFromTotal: maxAllocatable,
        hasGroup: true,
        groupName: jarDisplayName,
        groupBudget: totalCategoryBudget,
        parentBudget: totalCategoryBudget,
        alreadyAllocated: otherJarsAllocated,
        maxAllocatable,
        limitingReason: 'total',
        parentKey: 'overall',
      };
    }

    // 3. Detailed category
    const cat = categories.find(c => c.id === catId);
    if (!cat) {
      return {
        type: 'category',
        parentName: 'Ngân sách tổng danh mục',
        totalCategoryBudget,
        allOtherDetailedBudgets: 0,
        remainingFromTotal: totalCategoryBudget,
        hasGroup: false,
        parentBudget: totalCategoryBudget,
        alreadyAllocated: 0,
        maxAllocatable: totalCategoryBudget,
        limitingReason: 'total',
      };
    }

    // Sum of all other detailed category budgets (excluding this category)
    const allOtherDetailedBudgets = budgets
      .filter(b => b.categoryId !== 'overall' && !b.categoryId.startsWith('jar_') && b.categoryId !== catId)
      .reduce((sum, b) => sum + b.amount, 0);

    const remainingFromTotal = totalCategoryBudget > 0
      ? Math.max(0, totalCategoryBudget - allOtherDetailedBudgets)
      : 0;

    if (cat.jar) {
      const jarKey = cat.jar;
      const jarInfo = getJarInfo(jarKey, household?.jarCustomNames);

      const directDoc = budgets.find(b => b.categoryId === `jar_${jarKey}`);
      let groupBudget = directDoc?.amount || 0;

      if (groupBudget === 0 && totalCategoryBudget > 0) {
        const pct = household?.jarsConfig?.[jarKey] || jarInfo.percent;
        groupBudget = Math.round((totalCategoryBudget * pct) / 100);
      }

      // Sibling categories in the same jar (excluding this category itself)
      const siblingInGroupAllocated = budgets
        .filter(b => {
          if (b.categoryId === 'overall' || b.categoryId.startsWith('jar_') || b.categoryId === catId) return false;
          const cObj = categories.find(c => c.id === b.categoryId);
          return cObj?.jar === jarKey;
        })
        .reduce((sum, b) => sum + b.amount, 0);

      const remainingFromGroup = groupBudget > 0
        ? Math.max(0, groupBudget - siblingInGroupAllocated)
        : 0;

      let maxAllocatable = 0;
      let limitingReason: 'total' | 'group' | 'none' = 'none';

      if (totalCategoryBudget === 0 && groupBudget === 0) {
        maxAllocatable = 0;
        limitingReason = 'total';
      } else if (totalCategoryBudget > 0 && groupBudget > 0) {
        if (remainingFromGroup <= remainingFromTotal) {
          maxAllocatable = remainingFromGroup;
          limitingReason = 'group';
        } else {
          maxAllocatable = remainingFromTotal;
          limitingReason = 'total';
        }
      } else if (totalCategoryBudget > 0) {
        maxAllocatable = remainingFromTotal;
        limitingReason = 'total';
      } else {
        maxAllocatable = remainingFromGroup;
        limitingReason = 'group';
      }

      return {
        type: 'category',
        parentName: `Lọ ${jarInfo.shortName} (${jarInfo.name})`,
        totalCategoryBudget,
        allOtherDetailedBudgets,
        remainingFromTotal,
        hasGroup: true,
        groupName: `Lọ ${jarInfo.shortName}`,
        groupBudget,
        siblingInGroupAllocated,
        remainingFromGroup,
        parentBudget: groupBudget > 0 ? groupBudget : totalCategoryBudget,
        alreadyAllocated: siblingInGroupAllocated,
        maxAllocatable,
        limitingReason,
        parentKey: groupBudget > 0 ? `jar_${jarKey}` : 'overall',
      };
    } else {
      // Category without jar: depends directly on total category budget
      return {
        type: 'category',
        parentName: 'Ngân sách tổng danh mục',
        totalCategoryBudget,
        allOtherDetailedBudgets,
        remainingFromTotal,
        hasGroup: false,
        parentBudget: totalCategoryBudget,
        alreadyAllocated: allOtherDetailedBudgets,
        maxAllocatable: remainingFromTotal,
        limitingReason: 'total',
        parentKey: 'overall',
      };
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Ngân sách
              </h2>
              <p className="text-[11px] text-slate-400">{formatMonthYear(currentMonth)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
            {/* Rollover Toggle */}
            <button
              type="button"
              onClick={handleToggleRollover}
              className={`flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold border transition ${
                household?.rolloverBudgetEnabled !== false
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title="Dồn số tiền tiêu thừa (dư) hoặc thiếu (vượt) từ tháng trước sang tháng này"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dồn tháng: {household?.rolloverBudgetEnabled !== false ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              onClick={() => {
                setSixJarsInitialTab('allocate');
                setIsSixJarsConfigOpen(true);
              }}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-xs transition"
              title="Cấu hình Quy tắc 6 lọ"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">6 Lọ</span>
            </button>

            <button
              onClick={() => {
                setSixJarsInitialTab('names');
                setIsSixJarsConfigOpen(true);
              }}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800 transition"
              title="Đổi tên tùy biến cho các lọ"
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đổi tên lọ</span>
            </button>

            <button
              onClick={() => handleOpenAdjustModal('overall')}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition"
              title="Thêm nhanh ngân sách riêng không chia tỷ lệ"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm tiền</span>
            </button>

            <button
              onClick={() => handleOpenModal('overall')}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              title="Chỉnh sửa ngân sách tổng"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{overallBudget ? 'Sửa tổng' : 'Đặt tổng'}</span>
            </button>
          </div>
        </div>

        {/* Overall Budget Progress */}
        {(() => {
          const overallRollover = budgetRollovers['overall'];
          const isRolloverActive = household?.rolloverBudgetEnabled !== false && overallRollover && overallRollover.rolloverAmount !== 0;
          const displayBudget = isRolloverActive ? overallRollover.effectiveBudget : summary.overallBudget;
          const displayRemaining = isRolloverActive ? overallRollover.remainingAmount : summary.remainingBudget;
          const displayPercent = isRolloverActive ? overallRollover.percentUsed : summary.spentPercentage;

          return (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Ngân sách tổng tháng này
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {displayBudget > 0 ? formatVND(displayBudget) : 'Chưa đặt'}
                  </p>
                </div>

                {displayBudget > 0 && (
                  <div className="text-right">
                    {(() => {
                      const badge = getStatusBadge(displayPercent);
                      const Icon = badge.icon;
                      return (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Rollover notification banner for overall budget */}
              {isRolloverActive && (
                <div className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-300">
                  <span className="text-slate-600 dark:text-slate-300">
                    Hạn mức gốc: <strong>{formatVND(overallRollover.currentAllocated)}</strong>
                  </span>
                  <span className={overallRollover.rolloverAmount > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                    {overallRollover.rolloverAmount > 0
                      ? `+${formatVND(overallRollover.rolloverAmount)} dồn tháng trước (thừa)`
                      : `-${formatVND(Math.abs(overallRollover.rolloverAmount))} bù tháng trước (thiếu)`}
                  </span>
                </div>
              )}

              {displayBudget > 0 ? (
                <>
                  {/* Progress track */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getStatusBadge(displayPercent).barColor
                      }`}
                      style={{ width: `${Math.min(displayPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Đã chi: <strong className="text-slate-800 dark:text-slate-200">{formatVND(summary.expense)}</strong> ({displayPercent.toFixed(0)}%)</span>
                    <span>Còn lại: <strong className={displayRemaining < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>{formatVND(displayRemaining)}</strong></span>
                  </div>
                </>
              ) : (
                <div className="pt-0.5 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Chưa có hạn mức. Bấm để chia tự động!</span>
                  <button
                    onClick={() => setIsSixJarsConfigOpen(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Chia tự động
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Tabs: Theo 6 Chiếc Lọ (JARS) vs Theo Danh Mục Chi Tiết */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setBudgetTab('six_jars')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            budgetTab === 'six_jars'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏺 6 Chiếc Lọ
        </button>
        <button
          onClick={() => setBudgetTab('categories')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            budgetTab === 'categories'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 font-bold shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📑 Danh mục ({expenseCategories.length})
        </button>
      </div>

      {/* VIEW 1: 6 JARS BUDGET ALLOCATION */}
      {budgetTab === 'six_jars' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hạn mức 6 Lọ
            </h3>
            <button
              onClick={() => setIsSixJarsConfigOpen(true)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              + Chia theo thu nhập
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sixJarsBreakdown.map(j => {
              const jarKey = j.jarCode;
              const jarRollover = budgetRollovers['jar_' + jarKey];
              const isRolloverActive = household?.rolloverBudgetEnabled !== false && jarRollover && jarRollover.rolloverAmount !== 0;
              const rawJarBudget = getJarBudget(jarKey);
              const effectiveJarBudget = isRolloverActive ? jarRollover.effectiveBudget : rawJarBudget;
              const spent = j.amount;
              const percent = effectiveJarBudget > 0 ? (spent / effectiveJarBudget) * 100 : 0;
              const remaining = effectiveJarBudget - spent;
              const badge = effectiveJarBudget > 0 ? getStatusBadge(percent) : null;
              const BadgeIcon = badge ? badge.icon : null;
              const isExpanded = expandedJar === j.jarCode;

              // Categories in this jar
              const subCats = categoryBreakdown.filter(c => {
                const catObj = categories.find(x => x.id === c.categoryId);
                return catObj?.jar === j.jarCode;
              });

              return (
                <div
                  key={j.jarCode}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: j.jarInfo.color }}
                      >
                        <IconRenderer name={j.jarInfo.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {j.jarInfo.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setSixJarsInitialTab('names');
                              setIsSixJarsConfigOpen(true);
                            }}
                            className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-0.5 rounded transition shrink-0"
                            title={`Đổi tên gọi cho Lọ ${j.jarInfo.shortName}`}
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white shrink-0"
                            style={{ backgroundColor: j.jarInfo.color }}
                          >
                            {household?.jarsConfig?.[j.jarCode] || j.targetPercent}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Đã chi: <strong className="text-slate-800 dark:text-slate-200">{formatVND(spent)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {badge && BadgeIcon && (
                        <div
                          className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </div>
                      )}
                      {/* Quick Add Budget button for this jar */}
                      <button
                        onClick={() => handleOpenAdjustModal(`jar_${j.jarCode}`)}
                        className="p-1.5 sm:px-2 sm:py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1"
                        title="Tăng riêng ngân sách cho lọ này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Thêm</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(`jar_${j.jarCode}`)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Chỉnh sửa hạn mức lọ này"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rollover Info Banner for this Jar */}
                  {isRolloverActive && (
                    <div className="flex items-center justify-between text-[10.5px] py-1 px-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40">
                      <span className="text-slate-500 dark:text-slate-400">
                        Gốc tháng: <strong>{formatVND(rawJarBudget)}</strong>
                      </span>
                      <span className={jarRollover.rolloverAmount > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                        {jarRollover.rolloverAmount > 0
                          ? `+${formatVND(jarRollover.rolloverAmount)} dồn tháng trước (thừa)`
                          : `-${formatVND(Math.abs(jarRollover.rolloverAmount))} bù tháng trước (thiếu)`}
                      </span>
                    </div>
                  )}

                  {effectiveJarBudget > 0 || (isRolloverActive && jarRollover.rolloverAmount !== 0) ? (
                    <div>
                      {/* Visual track */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${badge?.barColor || 'bg-rose-500'}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Hạn mức thực tế: <strong className="text-slate-800 dark:text-slate-200">{formatVND(effectiveJarBudget)}</strong> ({percent.toFixed(0)}%)
                        </span>
                        <span className={remaining < 0 ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold'}>
                          {remaining < 0 ? `Vượt ${formatVND(Math.abs(remaining))}` : `Còn ${formatVND(remaining)}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Chưa đặt hạn mức cho lọ này</span>
                      <button
                        onClick={() => handleOpenModal(`jar_${j.jarCode}`)}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        + Thiết lập
                      </button>
                    </div>
                  )}

                  {/* Toggle subcategories breakdown */}
                  {subCats.length > 0 && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setExpandedJar(isExpanded ? null : j.jarCode)}
                        className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-600 pt-1"
                      >
                        <span>Xem {subCats.length} danh mục con</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                          {subCats.map(sub => (
                            <div key={sub.categoryId} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {sub.categoryName}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {formatVND(sub.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED CATEGORY BUDGETS */}
      {budgetTab === 'categories' && (
        <div className="space-y-3">
          {/* Overall Category Budget Allocation Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Ngân sách tổng danh mục
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Phân bổ hạn mức tối đa cho từng danh mục
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenModal('overall')}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition"
              >
                {overallBudget ? 'Sửa ngân sách tổng' : '+ Đặt ngân sách tổng'}
              </button>
            </div>

            {overallBudget && overallBudget.amount > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ngân sách tổng</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {formatVND(overallBudget.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Đã phân bổ ({totalDetailedAllocatedPct}%)</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatVND(totalDetailedAllocated)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tối đa còn lại</span>
                    <span className={`text-xs sm:text-sm font-black ${unallocatedDetailedAmount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                      {formatVND(unallocatedDetailedAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      totalDetailedAllocatedPct > 100
                        ? 'bg-rose-500'
                        : totalDetailedAllocatedPct >= 90
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(totalDetailedAllocatedPct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{detailedBudgetsCount} danh mục đã được đặt hạn mức</span>
                  <span className={unallocatedDetailedAmount === 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                    {unallocatedDetailedAmount === 0 ? 'Đã phân bổ đủ 100%' : `Còn ${formatVND(unallocatedDetailedAmount)}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Chưa có Ngân sách tổng danh mục</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Hãy thiết lập ngân sách tổng để tính toán hạn mức tối đa có thể phân bổ cho từng danh mục chi tiết.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal('overall')}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs"
                >
                  Đặt ngay
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Danh mục chi tiết ({expenseCategories.length})
            </h3>
            <span className="text-xs text-slate-400">
              {detailedBudgetsCount} có hạn mức
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {expenseCategories.map(cat => {
              const budgetDoc = budgets.find(b => b.categoryId === cat.id);
              const budgetAmount = budgetDoc ? budgetDoc.amount : 0;
              const catRollover = budgetRollovers[cat.id];
              const isRolloverActive = household?.rolloverBudgetEnabled !== false && catRollover && catRollover.rolloverAmount !== 0;
              const effectiveBudget = isRolloverActive ? catRollover.effectiveBudget : budgetAmount;

              const spending = categoryBreakdown.find(c => c.categoryId === cat.id);
              const spentAmount = spending ? spending.amount : 0;
              const percent = effectiveBudget > 0 ? (spentAmount / effectiveBudget) * 100 : 0;
              const remaining = effectiveBudget - spentAmount;
              const badge = effectiveBudget > 0 ? getStatusBadge(percent) : null;
              const BadgeIcon = badge ? badge.icon : null;
              const jarInfo = cat.jar ? getJarInfo(cat.jar, household?.jarCustomNames) : null;

              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconRenderer name={cat.icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {cat.name}
                          </h4>
                          {jarInfo && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white shrink-0"
                              style={{ backgroundColor: jarInfo.color }}
                              title={`Lọ ${jarInfo.name}`}
                            >
                              <span className="sm:hidden">{jarInfo.code}</span>
                              <span className="hidden sm:inline">{jarInfo.shortName}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Đã chi: <strong className="text-slate-700 dark:text-slate-300">{formatVND(spentAmount)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {badge && BadgeIcon && (
                        <div
                          className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </div>
                      )}
                      {/* Quick Add Budget button */}
                      <button
                        onClick={() => handleOpenAdjustModal(cat.id)}
                        className="p-1.5 sm:px-2 sm:py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1"
                        title="Tăng riêng ngân sách cho mục này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Thêm</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Chỉnh sửa hạn mức"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rollover Info Banner for this Category */}
                  {isRolloverActive && (
                    <div className="flex items-center justify-between text-[10.5px] py-1 px-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40">
                      <span className="text-slate-500 dark:text-slate-400">
                        Gốc tháng: <strong>{formatVND(budgetAmount)}</strong>
                      </span>
                      <span className={catRollover.rolloverAmount > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                        {catRollover.rolloverAmount > 0
                          ? `+${formatVND(catRollover.rolloverAmount)} dồn tháng trước (thừa)`
                          : `-${formatVND(Math.abs(catRollover.rolloverAmount))} bù tháng trước (thiếu)`}
                      </span>
                    </div>
                  )}

                  {effectiveBudget > 0 || (isRolloverActive && catRollover.rolloverAmount !== 0) ? (
                    <div>
                      {/* Visual bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${badge?.barColor || 'bg-rose-500'}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Hạn mức thực tế: <strong className="text-slate-800 dark:text-slate-200">{formatVND(effectiveBudget)}</strong> ({percent.toFixed(0)}%)
                          {overallBudget && overallBudget.amount > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({Math.round((effectiveBudget / overallBudget.amount) * 100)}% tổng)
                            </span>
                          )}
                        </span>
                        <span className={remaining < 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          {remaining < 0 ? `Vượt ${formatVND(Math.abs(remaining))}` : `Còn ${formatVND(remaining)}`}
                        </span>
                      </div>
                    </div>
                  ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Chưa đặt hạn mức riêng</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenAdjustModal(cat.id)}
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm tiền</span>
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <button
                            onClick={() => handleOpenModal(cat.id)}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          >
                            Thiết lập
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set/Edit Single Category Budget Modal */}
      {isModalOpen && (() => {
        const parentCtx = getParentBudgetContext(selectedCatId);
        const isDetailedCat = selectedCatId !== 'overall' && !selectedCatId.startsWith('jar_');
        const numEntered = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
        const existingDoc = budgets.find(b => b.categoryId === selectedCatId);
        const hasParentBudget = parentCtx.totalCategoryBudget > 0 || (parentCtx.groupBudget !== undefined && parentCtx.groupBudget > 0);
        const isExceeding = isDetailedCat && hasParentBudget && numEntered > parentCtx.maxAllocatable;
        const isDepleted = isDetailedCat && hasParentBudget && parentCtx.maxAllocatable === 0 && (!existingDoc || numEntered > 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedCatId === 'overall'
                    ? 'Ngân sách tổng danh mục'
                    : selectedCatId.startsWith('jar_')
                    ? `Ngân sách lọ ${getJarDisplayName(selectedCatId.replace('jar_', '') as JarType, household?.jarCustomNames)}`
                    : `Ngân sách: ${categories.find(c => c.id === selectedCatId)?.name || 'Danh mục'}`}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} noValidate className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Mục tiêu ngân sách
                  </label>
                  <select
                    value={selectedCatId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedCatId(id);
                      const b = budgets.find(x => x.categoryId === id);
                      setAmountStr(b ? String(b.amount) : '');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="overall">Ngân sách tổng danh mục (Toàn tháng)</option>
                    <optgroup label="Theo 6 Chiếc Lọ">
                      {(['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'] as JarType[]).map(k => (
                        <option key={`jar_${k}`} value={`jar_${k}`}>
                          🏺 Lọ {getJarInfo(k, household?.jarCustomNames).name} ({household?.jarsConfig?.[k] || SIX_JARS[k].percent}%)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Theo Danh mục chi tiết">
                      {expenseCategories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.jar ? `(${c.jar})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Parent budget dependency & calculation banner for detailed categories */}
                {isDetailedCat && (
                  hasParentBudget ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                      {parentCtx.totalCategoryBudget > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Ngân sách tổng danh mục:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatVND(parentCtx.totalCategoryBudget)}
                          </span>
                        </div>
                      )}

                      {parentCtx.hasGroup && parentCtx.groupBudget && parentCtx.groupBudget > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Hạn mức nhóm ({parentCtx.groupName}):</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatVND(parentCtx.groupBudget)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          {parentCtx.hasGroup && parentCtx.limitingReason === 'group'
                            ? `Mục khác trong nhóm ${parentCtx.groupName} đã đặt:`
                            : 'Các danh mục khác đã phân bổ:'}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatVND(parentCtx.hasGroup && parentCtx.limitingReason === 'group'
                            ? parentCtx.siblingInGroupAllocated || 0
                            : parentCtx.allOtherDetailedBudgets)}
                        </span>
                      </div>

                      {/* Highlighted Maximum Allocatable */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                            Tối đa có thể phân bổ:
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {parentCtx.limitingReason === 'group'
                              ? `Giới hạn theo nhóm ${parentCtx.groupName}`
                              : 'Theo Ngân sách tổng còn lại'}
                          </span>
                        </div>
                        <span className={`font-black text-sm ${parentCtx.maxAllocatable > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {formatVND(parentCtx.maxAllocatable)}
                        </span>
                      </div>

                      {/* Mini allocation progress track */}
                      {parentCtx.totalCategoryBudget > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isExceeding ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (((parentCtx.allOtherDetailedBudgets || 0) + numEntered) / parentCtx.totalCategoryBudget) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Phân bổ: {Math.round((((parentCtx.allOtherDetailedBudgets || 0) + numEntered) / parentCtx.totalCategoryBudget) * 100)}%</span>
                            <span>{parentCtx.maxAllocatable - numEntered >= 0 ? `Còn ${formatVND(parentCtx.maxAllocatable - numEntered)}` : 'Vượt mức'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Hạn mức riêng cho danh mục này
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Bạn có thể đặt trực tiếp ngân sách cho mục này độc lập mà không cần chia theo tỷ lệ.
                      </p>
                    </div>
                  )
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 dark:text-slate-300">
                      Hạn mức chi tối đa (VND)
                    </label>
                    {isDetailedCat && hasParentBudget && parentCtx.maxAllocatable > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Gợi ý tối đa: {formatVND(parentCtx.maxAllocatable)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ví dụ: 5.000.000"
                      value={amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                      onChange={e => setAmountStr(e.target.value.replace(/\D/g, ''))}
                      className={`w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                        isExceeding
                          ? 'border-amber-300 dark:border-amber-700 focus:ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      đ
                    </span>
                  </div>

                  {isExceeding && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between">
                      <span>Mức này vượt ngân sách tổng hiện tại ({formatVND(parentCtx.maxAllocatable)}).</span>
                      <button
                        type="button"
                        onClick={() => setAmountStr(String(parentCtx.maxAllocatable))}
                        className="font-bold underline ml-1 text-amber-900 dark:text-amber-200"
                      >
                        Đặt mức tối đa
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick allocation buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {isDetailedCat && hasParentBudget ? (
                    parentCtx.maxAllocatable > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAmountStr(String(parentCtx.maxAllocatable))}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                        >
                          Tối đa ({formatVND(parentCtx.maxAllocatable)})
                        </button>
                        {[0.5, 0.25, 0.75].map(ratio => {
                          const val = Math.round(parentCtx.maxAllocatable * ratio);
                          if (val < 100000) return null;
                          return (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAmountStr(String(val))}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                            >
                              {ratio * 100}% ({formatVND(val)})
                            </button>
                          );
                        })}
                      </>
                    ) : (
                      <div className="p-2 w-full rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-[11px]">
                        Đã hết ngân sách có thể phân bổ. Hãy tăng ngân sách tổng hoặc giảm các danh mục khác.
                      </div>
                    )
                  ) : !isDetailedCat ? (
                    [2000000, 5000000, 10000000, 20000000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountStr(String(val))}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
                      >
                        {val / 1000000} triệu
                      </button>
                    ))
                  ) : null}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  {existingDoc ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(selectedCatId)}
                      disabled={isSubmitting}
                      className="text-rose-600 hover:text-rose-700 font-semibold text-xs py-2 px-1 hover:underline"
                    >
                      Xóa hạn mức
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold shadow-xs transition"
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu ngân sách'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Quick Add / Adjust Budget Modal (Requirement #2) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm ngân sách riêng mục
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Tăng hạn mức trực tiếp, không chia theo tỷ lệ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Mục tiêu tăng ngân sách
                </label>
                <select
                  value={adjustTargetId}
                  onChange={e => setAdjustTargetId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="overall">Ngân sách tổng (Toàn tháng)</option>
                  <optgroup label="Theo 6 Chiếc Lọ">
                    {(['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'] as JarType[]).map(k => (
                      <option key={`jar_${k}`} value={`jar_${k}`}>
                        🏺 Lọ {getJarInfo(k, household?.jarCustomNames).name} (Hiện tại: {formatVND(getJarBudget(k))})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Theo Danh mục chi tiết">
                    {expenseCategories.map(c => {
                      const curB = budgets.find(b => b.categoryId === c.id)?.amount || 0;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} (Hiện tại: {formatVND(curB)})
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Số tiền muốn cộng thêm (+đ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ví dụ: 1.000.000"
                    value={adjustDeltaStr ? parseInt(adjustDeltaStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                    onChange={e => setAdjustDeltaStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">đ</span>
                </div>

                {/* Quick Add Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[200000, 500000, 1000000, 2000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustDeltaStr(String(amt))}
                      className="py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-[10px] transition"
                    >
                      +{formatVND(amt).replace('₫', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sync with Overall Budget Checkbox */}
              {adjustTargetId !== 'overall' && (
                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustSyncOverall}
                    onChange={e => setAdjustSyncOverall(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    Đồng thời cộng thêm số tiền này vào <strong>Ngân sách tổng của tháng</strong>
                  </span>
                </label>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting || !adjustDeltaStr}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition disabled:opacity-50"
                >
                  {isAdjusting ? 'Đang lưu...' : 'Thêm ngân sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6 Jars Configuration & Auto-Budgeting Modal */}
      <SixJarsConfigModal
        isOpen={isSixJarsConfigOpen}
        onClose={() => setIsSixJarsConfigOpen(false)}
        initialTab={sixJarsInitialTab}
      />
    </div>
  );
};
