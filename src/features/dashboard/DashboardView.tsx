import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  PieChart as PieIcon, 
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  Settings,
  ChevronDown,
  Plus,
  Coins,
  CreditCard,
  HandCoins,
  ArrowRightLeft
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { 
  calculateMonthlySummary, 
  calculateCategoryBreakdown, 
  calculateAccountBalances,
  generateClientInsights,
  calculateSixJarsBreakdown,
  JarSpending
} from '../../utils/calculations';
import { formatVND, formatFriendlyDate } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { RecurringBanner } from '../recurring/RecurringBanner';
import { SixJarsConfigModal } from '../budgets/SixJarsConfigModal';
import { SIX_JARS } from '../../utils/defaultData';
import { JarType } from '../../types';

interface DashboardViewProps {
  onNavigateToTransactions: () => void;
  onNavigateToBudgets: () => void;
  onOpenQuickAdd: () => void;
  onOpenAccounts?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTransactions,
  onNavigateToBudgets,
  onOpenQuickAdd,
  onOpenAccounts,
}) => {
  const { 
    household,
    transactions, 
    prevMonthTransactions, 
    categories, 
    accounts, 
    budgets, 
    budgetRollovers,
    loading 
  } = useHousehold();

  const [isSixJarsOpen, setIsSixJarsOpen] = useState(false);
  const [expandedJar, setExpandedJar] = useState<JarType | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [showAllocationExplanation, setShowAllocationExplanation] = useState(false);
  const [isAllocationSectionExpanded, setIsAllocationSectionExpanded] = useState(false);
  const [isAccountsSectionExpanded, setIsAccountsSectionExpanded] = useState(false);

  const hasCustomConfig = Boolean(household?.jarsConfig);
  const summary = calculateMonthlySummary(transactions, budgets);

  // Helper to compute allocated budget for each jar (strictly consistent with BudgetView)
  const getJarBudget = (jarKey: JarType): number => {
    // 1. Direct jar budget doc: 'jar_' + jarKey
    const directDoc = budgets.find(b => b.categoryId === `jar_${jarKey}`);
    if (directDoc && directDoc.amount > 0) return directDoc.amount;

    // 2. Or sum of subcategory budgets belonging to this jar
    const catsInJar = categories.filter(c => c.jar === jarKey && c.type === 'expense').map(c => c.id);
    const sumCatBudgets = budgets
      .filter(b => catsInJar.includes(b.categoryId))
      .reduce((sum, b) => sum + b.amount, 0);

    if (sumCatBudgets > 0) return sumCatBudgets;

    // 3. Or derived from overall budget using jar percentage
    const overallBudgetDoc = budgets.find(b => b.categoryId === 'overall');
    if (overallBudgetDoc && overallBudgetDoc.amount > 0) {
      const pct = household?.jarsConfig?.[jarKey] || SIX_JARS[jarKey].percent;
      return Math.round((overallBudgetDoc.amount * pct) / 100);
    }

    return 0;
  };

  const overallRollover = budgetRollovers?.['overall'];
  const isRolloverActive = household?.rolloverBudgetEnabled !== false && overallRollover && overallRollover.rolloverAmount !== 0;
  const displayOverallBudget = isRolloverActive ? overallRollover.effectiveBudget : summary.overallBudget;
  const displayRemainingBudget = isRolloverActive ? overallRollover.remainingAmount : summary.remainingBudget;
  const displaySpentPct = isRolloverActive ? overallRollover.percentUsed : summary.spentPercentage;

  const categoryBreakdown = calculateCategoryBreakdown(transactions, categories, budgets);
  const accountBalances = calculateAccountBalances(accounts, transactions);
  const insights = generateClientInsights(transactions, prevMonthTransactions, categories, budgets, household?.jarsConfig);
  const jars = calculateSixJarsBreakdown(transactions, categories, summary.income, household?.jarsConfig, household?.jarCustomNames);

  const topCategories = categoryBreakdown.slice(0, 5);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-3.5 pb-20 animate-in fade-in duration-200">
      {/* Recurring reminders banner */}
      <RecurringBanner />

      {/* Main Financial Cards: Income, Expense, Balance */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Thu nhập */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-0.5 sm:mb-1">
            <div className="p-0.5 sm:p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate text-[10px] sm:text-xs">Thu nhập</span>
          </div>
          <p className="text-xs sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
            {formatVND(summary.income)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400">tháng này</span>
        </div>

        {/* Chi tiêu */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-0.5 sm:mb-1">
            <div className="p-0.5 sm:p-1 rounded-md bg-rose-50 dark:bg-rose-950/60">
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate text-[10px] sm:text-xs">Chi tiêu</span>
          </div>
          <p className="text-xs sm:text-base md:text-lg font-black text-slate-900 dark:text-white truncate">
            {formatVND(summary.expense)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400">tháng này</span>
        </div>

        {/* Còn lại */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-0.5 sm:mb-1">
            <div className="p-0.5 sm:p-1 rounded-md bg-sky-50 dark:bg-sky-950/60">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="truncate text-[10px] sm:text-xs">Còn lại</span>
          </div>
          <p
            className={`text-xs sm:text-base md:text-lg font-black truncate ${
              summary.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatVND(summary.balance)}
          </p>
          <span className="text-[9px] sm:text-[10px] text-slate-400">
            {summary.balance >= 0 ? 'thặng dư' : 'thâm hụt'}
          </span>
        </div>
      </div>

      {/* Monthly Budget Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ngân sách
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                {displayOverallBudget > 0
                  ? `Đã dùng ${displaySpentPct.toFixed(0)}%`
                  : 'Chưa đặt hạn mức'}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToBudgets}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {displayOverallBudget > 0 ? (
          <div className="mt-2.5 space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  displayRemainingBudget < 0
                    ? 'bg-rose-500'
                    : displaySpentPct >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(displaySpentPct, 100)}%` }}
              />
            </div>

            {/* Numbers: Spent, Total Budget, Remaining */}
            <div className="grid grid-cols-3 gap-1 text-center sm:text-left sm:flex sm:items-center sm:justify-between text-[11px] sm:text-xs pt-0.5">
              <div>
                <span className="text-slate-400 block sm:inline">Đã chi: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatVND(summary.expense)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block sm:inline">Ngân sách: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatVND(displayOverallBudget)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block sm:inline">Còn: </span>
                <span
                  className={`font-bold ${
                    displayRemainingBudget < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatVND(displayRemainingBudget)}
                </span>
              </div>
            </div>

            {/* Rollover badge if active */}
            {isRolloverActive && (
              <div className="flex items-center justify-between text-[10.5px] py-1 px-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40">
                <span className="text-slate-500 dark:text-slate-400">
                  Gốc tháng: <strong>{formatVND(overallRollover.currentAllocated)}</strong>
                </span>
                <span className={overallRollover.rolloverAmount > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {overallRollover.rolloverAmount > 0
                    ? `+${formatVND(overallRollover.rolloverAmount)} dồn tháng trước (thừa)`
                    : `-${formatVND(Math.abs(overallRollover.rolloverAmount))} bù tháng trước (thiếu)`}
                </span>
              </div>
            )}

            {/* Context message */}
            {displayRemainingBudget < 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Đã chi vượt ngân sách!</span>
              </div>
            ) : displaySpentPct >= 80 ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Chú ý: Đã chi hơn 80% hạn mức.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Chi tiêu trong tầm kiểm soát.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Đặt ngân sách để kiểm soát chi tiêu hiệu quả.
            </p>
            <button
              onClick={onNavigateToBudgets}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
            >
              Đặt ngân sách
            </button>
          </div>
        )}
      </div>

      {/* Danh mục phân bổ tài chính (Theo quy tắc 6 lọ hoặc tùy chỉnh) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
        {/* Accordion Card Header */}
        <div
          onClick={() => setIsAllocationSectionExpanded(!isAllocationSectionExpanded)}
          className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  Danh mục phân bổ tài chính
                </h3>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllocationExplanation(!showAllocationExplanation);
                  }}
                  className="p-0.5 text-slate-400 hover:text-indigo-500 rounded transition"
                  title="Xem giải thích quy tắc 6 lọ"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Theo quy tắc 6 lọ hoặc tùy chỉnh • {jars.length} danh mục
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSixJarsOpen(true);
              }}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition shadow-2xs"
              title="Tùy chỉnh tỷ lệ phân bổ các lọ"
            >
              <Settings className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Tùy chỉnh</span>
            </button>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">
              Đã chi: {formatVND(jars.reduce((s, j) => s + j.amount, 0))}
            </span>

            <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isAllocationSectionExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {isAllocationSectionExpanded && (
          <div className="p-3.5 sm:p-4 pt-0 sm:pt-0 space-y-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">

        {/* Interactive explanation on click */}
        {showAllocationExplanation && (
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                <span>💡</span>
                <span>Theo quy tắc 6 lọ hoặc tùy chỉnh</span>
              </p>
              <button
                onClick={() => setShowAllocationExplanation(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Mô hình mặc định được gợi ý theo <strong>Quy tắc 6 Chiếc Lọ</strong> chuẩn (Thiết yếu 55%, Tự do tài chính 10%, Tiết kiệm 10%, Giáo dục 10%, Hưởng thụ 10%, Cho đi 5%). 
              Bạn có thể linh hoạt bấm <strong>Tùy chỉnh</strong> để thay đổi tỷ lệ % hoặc đổi tên từng danh mục cho sát với thực tế chi tiêu của gia đình mình.
            </p>
          </div>
        )}

        {summary.income > 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <span>Thu nhập tháng: <strong className="text-slate-800 dark:text-slate-200">{formatVND(summary.income)}</strong></span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Chạm xem chi tiết</span>
          </div>
        )}

        {/* Expandable List Item / Accordion Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
          {jars.map(jar => {
            const jarKey = jar.jarCode;
            const jarRollover = budgetRollovers?.['jar_' + jarKey];
            const isRolloverActive = household?.rolloverBudgetEnabled !== false && jarRollover && jarRollover.rolloverAmount !== 0;
            const rawJarBudget = getJarBudget(jarKey);
            const effectiveJarBudget = isRolloverActive ? jarRollover.effectiveBudget : rawJarBudget;
            const spent = jar.amount;
            const spentPercent = effectiveJarBudget > 0 ? (spent / effectiveJarBudget) * 100 : 0;
            const remaining = effectiveJarBudget - spent;
            const isOver = effectiveJarBudget > 0 && spent > effectiveJarBudget;
            const isNear = effectiveJarBudget > 0 && spentPercent >= 80 && !isOver;
            const isExpanded = expandedJar === jar.jarCode;

            return (
              <div key={jar.jarCode} className="transition-colors">
                {/* Accordion Row Header / Summary */}
                <button
                  type="button"
                  onClick={() => setExpandedJar(isExpanded ? null : jar.jarCode)}
                  className={`w-full px-2.5 sm:px-3 py-2.5 flex items-center justify-between text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    isExpanded ? 'bg-slate-50/80 dark:bg-slate-850' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: jar.jarInfo.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {jar.jarInfo.shortName}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          ({jar.targetPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Mini visual progress track based on Budget */}
                    <div className="hidden sm:block w-8 sm:w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : ''
                        }`}
                        style={{
                          width: `${Math.min(spentPercent, 100)}%`,
                          backgroundColor: !isOver && !isNear ? jar.jarInfo.color : undefined,
                        }}
                      />
                    </div>

                    <span className="text-xs font-bold text-slate-900 dark:text-white text-right">
                      {formatVND(spent)}
                    </span>

                    <span
                      className={`text-[10px] font-semibold min-w-[32px] text-right ${
                        isOver 
                          ? 'text-rose-600 font-bold' 
                          : isNear 
                          ? 'text-amber-600 font-bold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {effectiveJarBudget > 0 ? `${spentPercent.toFixed(0)}%` : '0%'}
                    </span>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Accordion Row Expanded Content */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 bg-slate-50/70 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>{jar.jarInfo.name}</strong>: {jar.jarInfo.description}
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-400">Ngân sách lọ</span>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {effectiveJarBudget > 0 ? formatVND(effectiveJarBudget) : 'Chưa đặt'}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-400">Thực chi</span>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {formatVND(spent)}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                        <span className="block text-[10px] text-slate-400">Đã chi</span>
                        <span
                          className={`block text-xs font-bold truncate ${
                            isOver ? 'text-rose-600' : isNear ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {effectiveJarBudget > 0 ? `${spentPercent.toFixed(0)}%` : '0%'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className={isOver ? 'text-rose-600 font-semibold' : isNear ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                        {isOver
                          ? `⚠️ Chi vượt ${formatVND(Math.abs(remaining))}`
                          : effectiveJarBudget > 0
                          ? `Còn lại ${formatVND(remaining)}`
                          : 'Chưa đặt hạn mức ngân sách'}
                      </span>
                      <button
                        onClick={onNavigateToBudgets}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        Đặt ngân sách lọ →
                      </button>
                    </div>

                    {/* Subcategories contributing to this Jar (Expandable breakdown) */}
                    {(() => {
                      const jarSubCats = categoryBreakdown.filter(item => {
                        const cat = categories.find(c => c.id === item.categoryId);
                        return cat && cat.jar === jarKey && item.amount > 0;
                      });

                      if (jarSubCats.length > 0) {
                        return (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Các khoản chi tháng này thuộc lọ:
                            </span>
                            <div className="space-y-1">
                              {jarSubCats.map(subCat => (
                                <div
                                  key={subCat.categoryId}
                                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-750 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                                      style={{ backgroundColor: subCat.color }}
                                    >
                                      <IconRenderer name={subCat.icon} className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {subCat.categoryName}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {formatVND(subCat.amount)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-1">
                                      ({((subCat.amount / (spent || 1)) * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <p className="pt-1 text-[10.5px] text-slate-400 italic">
                          Chưa có khoản chi nào trong lọ này tháng này.
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>

      {/* Smart Client Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý tài chính</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map(item => (
              <div
                key={item.id}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs flex items-start gap-2.5 shadow-xs ${
                  item.type === 'alert'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                    : item.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    : item.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <IconRenderer name={item.iconName} className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-[11px] leading-relaxed opacity-90 mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories Breakdown */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Top chi tiêu
          </h3>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Tất cả
          </button>
        </div>

        {topCategories.length > 0 ? (
          <div className="space-y-2.5">
            {topCategories.map(cat => (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {cat.categoryName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatVND(cat.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(cat.percentage, 100)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center text-xs text-slate-400">
            Chưa có chi tiêu tháng này.
          </div>
        )}
      </div>

      {/* Account Balances Summary Card (Expandable List Item / Accordion Row) */}
      {(() => {
        const visibleAccounts = accounts.filter(acc => acc.isActive !== false);

        // Financial totals across visible accounts
        let totalPositive = 0;
        let totalDebt = 0;
        visibleAccounts.forEach(acc => {
          const bal = accountBalances.get(acc.id) || 0;
          if (bal >= 0) {
            totalPositive += bal;
          } else {
            totalDebt += Math.abs(bal);
          }
        });
        const netWorth = totalPositive - totalDebt;

        return (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200">
            {/* Accordion Card Header */}
            <div
              onClick={() => setIsAccountsSectionExpanded(!isAccountsSectionExpanded)}
              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    Tài khoản & Nguồn tiền
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {visibleAccounts.length} nguồn tiền • Ròng: <strong className={netWorth >= 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>{formatVND(netWorth)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenAccounts && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAccounts();
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 hover:bg-blue-100 transition shadow-2xs"
                    title="Quản lý ví, thêm hoặc sửa tài khoản"
                  >
                    <Settings className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span className="hidden sm:inline">Quản lý ví</span>
                  </button>
                )}

                <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isAccountsSectionExpanded ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Content */}
            {isAccountsSectionExpanded && (
              <div className="p-3.5 sm:p-4 pt-0 sm:pt-0 space-y-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">

            {/* Total Balance Overview Summary Bar */}
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs">
              <div>
                <span className="block text-[9.5px] text-slate-400">Tiền & Tài sản</span>
                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {formatVND(totalPositive)}
                </span>
              </div>
              <div>
                <span className="block text-[9.5px] text-slate-400">Dư nợ / Vay</span>
                <span className="block text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                  {totalDebt > 0 ? `-${formatVND(totalDebt)}` : '0đ'}
                </span>
              </div>
              <div>
                <span className="block text-[9.5px] text-slate-400">Tài sản ròng</span>
                <span className={`block text-xs font-black truncate ${netWorth >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                  {formatVND(netWorth)}
                </span>
              </div>
            </div>

            {/* Accordion Rows List */}
            {visibleAccounts.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                {visibleAccounts.map(acc => {
                  const balance = accountBalances.get(acc.id) || 0;
                  const isNegative = balance < 0;
                  const isDebt = acc.type === 'debt';
                  const isCard = acc.type === 'card';
                  const isAsset = acc.type === 'asset';
                  const isExpanded = expandedAccount === acc.id;

                  // Compute monthly inflows and outflows for this account
                  const monthlyInflow = transactions
                    .filter(t => (t.type === 'income' && t.accountId === acc.id) || (t.type === 'transfer' && t.toAccountId === acc.id))
                    .reduce((sum, t) => sum + t.amount, 0);

                  const monthlyOutflow = transactions
                    .filter(t => (t.type === 'expense' && t.accountId === acc.id) || (t.type === 'transfer' && t.accountId === acc.id))
                    .reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div key={acc.id} className="transition-colors">
                      {/* Accordion Row Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedAccount(isExpanded ? null : acc.id)}
                        className={`w-full px-2.5 sm:px-3 py-2.5 flex items-center justify-between text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          isExpanded ? 'bg-slate-50/80 dark:bg-slate-850' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ 
                              backgroundColor: (isNegative || isDebt) && (isCard || isDebt) 
                                ? '#E11D48' 
                                : isAsset
                                ? '#D97706'
                                : acc.color 
                            }}
                          >
                            <IconRenderer 
                              name={acc.icon || (isDebt ? 'HandCoins' : isAsset ? 'Coins' : isCard ? 'CreditCard' : 'Landmark')} 
                              className="w-3.5 h-3.5" 
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {acc.name}
                              </span>
                              {isDebt && (
                                <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                                  Khoản nợ
                                </span>
                              )}
                              {isCard && (
                                <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                                  {isNegative ? 'Dư nợ thẻ' : 'Thẻ tín dụng'}
                                </span>
                              )}
                              {isAsset && (
                                <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                                  🪙 {acc.assetMetadata?.assetType === 'gold' ? 'Vàng' : acc.assetMetadata?.assetType === 'currency' ? 'Ngoại tệ' : 'Tài sản'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-bold text-right ${
                              isNegative || isDebt
                                ? 'text-rose-600 dark:text-rose-400'
                                : isAsset
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {formatVND(balance)}
                          </span>

                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                              isExpanded ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Accordion Row Expanded Content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1.5 bg-slate-50/70 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                          {/* Asset specific calculation breakdown */}
                          {isAsset && acc.assetMetadata && (
                            <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                              <span>
                                <strong>Khối lượng:</strong> {acc.assetMetadata.quantity} {acc.assetMetadata.unit}
                              </span>
                              <span>
                                <strong>Đơn giá:</strong> {formatVND(acc.assetMetadata.unitPrice)}
                              </span>
                            </div>
                          )}

                          {/* 3 Metrics Grid: Opening, Inflow, Outflow */}
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="block text-[9.5px] text-slate-400">Số dư đầu kỳ</span>
                              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                {formatVND(acc.openingBalance)}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="block text-[9.5px] text-slate-400">Thu vào tháng này</span>
                              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                +{formatVND(monthlyInflow)}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                              <span className="block text-[9.5px] text-slate-400">Chi ra tháng này</span>
                              <span className="block text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                                -{formatVND(monthlyOutflow)}
                              </span>
                            </div>
                          </div>

                          {/* Action links */}
                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <button
                              type="button"
                              onClick={onOpenQuickAdd}
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Thêm giao dịch mới</span>
                            </button>
                            {onOpenAccounts && (
                              <button
                                type="button"
                                onClick={onOpenAccounts}
                                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                              >
                                Sửa thông tin ví →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Chưa có tài khoản nào đang hoạt động.
              </div>
            )}
          </div>
        )}
      </div>
    );
  })()}

      {/* Recent Transactions List Preview */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Giao dịch gần đây
          </h3>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const acc = accounts.find(a => a.id === tx.accountId);
              return (
                <div key={tx.id} className="py-2 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{
                        backgroundColor:
                          tx.type === 'transfer' ? '#3B82F6' : cat?.color || '#94A3B8',
                      }}
                    >
                      <IconRenderer
                        name={tx.type === 'transfer' ? 'ArrowRightLeft' : cat?.icon || 'HelpCircle'}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.type === 'transfer'
                          ? 'Chuyển tiền'
                          : tx.note || cat?.name || 'Giao dịch'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {acc?.name || 'Ví'} • {formatFriendlyDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                      {formatVND(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400 mb-2.5">Chưa có giao dịch tháng này.</p>
            <button
              onClick={onOpenQuickAdd}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              + Thêm giao dịch
            </button>
          </div>
        )}
      </div>

      {/* Six Jars Configuration Modal */}
      {isSixJarsOpen && (
        <SixJarsConfigModal
          isOpen={isSixJarsOpen}
          onClose={() => setIsSixJarsOpen(false)}
        />
      )}
    </div>
  );
};
