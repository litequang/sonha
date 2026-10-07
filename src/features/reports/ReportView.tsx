import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  BarChart3, 
  LineChart as LineIcon,
  Calendar,
  Layers
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { 
  calculateMonthlySummary, 
  calculateCategoryBreakdown, 
  calculateDailyTotals,
  calculateSixJarsBreakdown 
} from '../../utils/calculations';
import { formatVND, formatMonthYear } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { SIX_JARS } from '../../utils/defaultData';

type TimeRangeOption = 'this_month' | 'prev_month' | 'six_jars' | 'comparison';

export const ReportView: React.FC = () => {
  const { 
    household,
    transactions, 
    prevMonthTransactions, 
    categories, 
    budgets, 
    currentMonth 
  } = useHousehold();

  const [activeTab, setActiveTab] = useState<TimeRangeOption>('this_month');

  // Selected transactions based on tab
  const currentSummary = useMemo(() => calculateMonthlySummary(transactions, budgets), [transactions, budgets]);
  const prevSummary = useMemo(() => calculateMonthlySummary(prevMonthTransactions, budgets), [prevMonthTransactions, budgets]);

  const activeTransactions = activeTab === 'prev_month' ? prevMonthTransactions : transactions;
  const activeSummary = activeTab === 'prev_month' ? prevSummary : currentSummary;

  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(activeTransactions, categories, budgets),
    [activeTransactions, categories, budgets]
  );

  const dailyTotals = useMemo(
    () => calculateDailyTotals(activeTransactions, currentMonth),
    [activeTransactions, currentMonth]
  );

  // Data for Donut Chart
  const pieData = useMemo(() => {
    return categoryBreakdown.slice(0, 8).map(c => ({
      name: c.categoryName,
      value: c.amount,
      color: c.color,
    }));
  }, [categoryBreakdown]);

  // Data for Income vs Expense Bar Chart
  const incomeVsExpenseData = [
    { name: 'Thu nhập', amount: activeSummary.income, fill: '#10B981' },
    { name: 'Chi tiêu', amount: activeSummary.expense, fill: '#F43F5E' },
  ];

  // Data for Comparison Bar Chart (This month vs Prev month)
  const comparisonData = [
    {
      category: 'Thu nhập',
      'Tháng này': currentSummary.income,
      'Tháng trước': prevSummary.income,
    },
    {
      category: 'Chi tiêu',
      'Tháng này': currentSummary.expense,
      'Tháng trước': prevSummary.expense,
    },
  ];

  // 6 Jars Data
  const sixJarsData = useMemo(
    () => calculateSixJarsBreakdown(transactions, categories, currentSummary.income, household?.jarsConfig, household?.jarCustomNames),
    [transactions, categories, currentSummary.income, household?.jarsConfig, household?.jarCustomNames]
  );

  const sixJarsChartData = useMemo(() => {
    return sixJarsData.map(j => ({
      name: j.jarInfo.shortName,
      'Thực tế (%)': Number(j.actualPercent.toFixed(1)),
      'Chuẩn (%)': j.targetPercent,
      amount: j.amount,
      color: j.jarInfo.color,
    }));
  }, [sixJarsData]);

  const sixJarsPieData = useMemo(() => {
    return sixJarsData.map(j => ({
      name: j.jarInfo.shortName,
      value: j.amount,
      color: j.jarInfo.color,
    }));
  }, [sixJarsData]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Header & Time Filter */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Báo Cáo Tài Chính
              </h2>
              <p className="text-xs text-slate-400">{formatMonthYear(currentMonth)}</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('this_month')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'this_month'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setActiveTab('six_jars')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'six_jars'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">🏺 6 Lọ</span>
            <span className="hidden sm:inline">🏺 6 Chiếc Lọ (JARS)</span>
          </button>
          <button
            onClick={() => setActiveTab('prev_month')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'prev_month'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tháng trước
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex-1 py-1.5 px-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            So sánh
          </button>
        </div>
      </div>

      {activeTab === 'six_jars' ? (
        /* 6 Jars Financial Rule Dedicated Analysis View */
        <div className="space-y-4">
          {/* Donut Chart: 6 Jars */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tỷ trọng thực tế theo 6 Chiếc Lọ (JARS)
              </h3>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                Chuẩn T. Harv Eker
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-56 w-56 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={sixJarsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sixJarsPieData.map((entry, index) => (
                        <Cell key={`jar-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatVND(Number(val))}
                      contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400">Tổng chi</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatVND(currentSummary.expense)}
                  </span>
                </div>
              </div>

              {/* Jars Breakdown List */}
              <div className="w-full space-y-2">
                {sixJarsData.map(j => (
                  <div key={j.jarCode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: j.jarInfo.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {j.jarInfo.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatVND(j.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          ({j.actualPercent.toFixed(0)}% / mục tiêu {j.targetPercent}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(j.actualPercent, 100)}%`,
                          backgroundColor: j.jarInfo.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Bar: Actual % vs Target % */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              So sánh: Tỷ lệ thực tế vs Mục tiêu chuẩn (%)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixJarsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={val => `${val}%`} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip
                    formatter={(val: any) => `${val}%`}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="Thực tế (%)" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Chuẩn (%)" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6 Jars Guide & Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sixJarsData.map(j => (
              <div
                key={j.jarCode}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: j.jarInfo.color }}
                    />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {j.jarInfo.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: j.jarInfo.color }}>
                    {j.targetPercent}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {j.jarInfo.description}
                </p>
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Đã chi tháng này:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatVND(j.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'comparison' ? (
        /* Comparison view */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              So sánh Tháng này vs Tháng trước
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={val => `${val / 1000000}tr`}
                    tick={{ fontSize: 10 }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val))}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="Tháng này" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Tháng trước" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Chi tiêu tháng này</p>
              <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatVND(currentSummary.expense)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Chi tiêu tháng trước</p>
              <p className="text-base font-black text-slate-700 dark:text-slate-300 mt-1">
                {formatVND(prevSummary.expense)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Single-Month Charts */
        <div className="space-y-4">
          {/* Chart 1: Donut Category Spending */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 mb-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tỷ lệ chi tiêu theo danh mục
              </h3>
            </div>

            {pieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="h-56 w-56 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => formatVND(Number(val))}
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                  {/* Center Total in Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400">Tổng chi</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatVND(activeSummary.expense)}
                    </span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="w-full space-y-1.5 max-h-52 overflow-y-auto">
                  {categoryBreakdown.map(cat => (
                    <div
                      key={cat.categoryId}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {cat.categoryName}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatVND(cat.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">
                Chưa có dữ liệu chi tiêu trong kỳ này.
              </p>
            )}
          </div>

          {/* Chart 2: Income vs Expense Bar Chart */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Thu vs Tổng Chi
              </h3>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={val => `${val / 1000000}tr`}
                    tick={{ fontSize: 10 }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val))}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {incomeVsExpenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Daily Spending Trend (Line Chart) */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 mb-2">
              <LineIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Diễn biến chi tiêu theo ngày trong tháng
              </h3>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTotals} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 9 }} interval={3} />
                  <YAxis
                    tickFormatter={val => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}tr` : `${val / 1000}k`)}
                    tick={{ fontSize: 9 }}
                    width={45}
                  />
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val))}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Chi tiêu"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
