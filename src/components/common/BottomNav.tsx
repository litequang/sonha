import React from 'react';
import { LayoutDashboard, ReceiptText, Plus, PieChart, BarChart3 } from 'lucide-react';

export type TabKey = 'dashboard' | 'transactions' | 'budgets' | 'reports';

interface BottomNavProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAdd,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Tab 1: Tổng quan */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[60px] h-[52px] px-2 rounded-xl transition ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Tổng quan</span>
        </button>

        {/* Tab 2: Giao dịch */}
        <button
          onClick={() => onSelectTab('transactions')}
          className={`flex flex-col items-center justify-center min-w-[60px] h-[52px] px-2 rounded-xl transition ${
            currentTab === 'transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Giao dịch</span>
        </button>

        {/* Center Floating Action Button: Quick Add */}
        <div className="relative -top-4 flex items-center justify-center">
          <button
            onClick={onOpenQuickAdd}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            aria-label="Thêm khoản thu chi"
            title="Thêm khoản thu hoặc chi tiêu nhanh"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Ngân sách */}
        <button
          onClick={() => onSelectTab('budgets')}
          className={`flex flex-col items-center justify-center min-w-[60px] h-[52px] px-2 rounded-xl transition ${
            currentTab === 'budgets'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Ngân sách</span>
        </button>

        {/* Tab 4: Báo cáo */}
        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center justify-center min-w-[60px] h-[52px] px-2 rounded-xl transition ${
            currentTab === 'reports'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Báo cáo</span>
        </button>
      </div>
    </nav>
  );
};
