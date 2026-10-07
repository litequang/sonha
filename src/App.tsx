import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { HouseholdProvider, useHousehold } from './hooks/useHousehold';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/common/Navbar';
import { BottomNav, TabKey } from './components/common/BottomNav';
import { DashboardView } from './features/dashboard/DashboardView';
import { TransactionList } from './features/transactions/TransactionList';
import { BudgetView } from './features/budgets/BudgetView';
import { ReportView } from './features/reports/ReportView';
import { QuickAddModal } from './features/transactions/QuickAddModal';
import { SettingsModal } from './features/settings/SettingsModal';
import { AccountsModal } from './features/accounts/AccountsModal';
import { CategoriesModal } from './features/categories/CategoriesModal';
import { RecurringRulesModal } from './features/recurring/RecurringRulesModal';
import { GoalsView } from './features/goals/GoalsView';
import { HouseholdPickerModal } from './features/household/HouseholdPickerModal';
import { SixJarsConfigModal } from './features/budgets/SixJarsConfigModal';
import { AuthView } from './features/auth/AuthView';
import { Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading, joinHouseholdWithInvite } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [householdInitialTab, setHouseholdInitialTab] = useState<'share_qr' | 'members' | 'join' | 'create'>('share_qr');
  const [isSixJarsOpen, setIsSixJarsOpen] = useState(false);

  // Check URL params for invite link: ?join_hh=...&invite=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlJoinHh = params.get('join_hh');
    const urlInviteToken = params.get('invite');

    if (urlJoinHh && urlInviteToken) {
      sessionStorage.setItem('sonha_pending_join_hh', urlJoinHh);
      sessionStorage.setItem('sonha_pending_invite_token', urlInviteToken);
      try {
        localStorage.setItem('sonha_pending_join_hh', urlJoinHh);
        localStorage.setItem('sonha_pending_invite_token', urlInviteToken);
      } catch (_) {}
    }

    if (!user) return;

    const joinHh = urlJoinHh || sessionStorage.getItem('sonha_pending_join_hh') || localStorage.getItem('sonha_pending_join_hh');
    const inviteToken = urlInviteToken || sessionStorage.getItem('sonha_pending_invite_token') || localStorage.getItem('sonha_pending_invite_token');

    if (joinHh && inviteToken) {
      joinHouseholdWithInvite(joinHh, inviteToken)
        .then(() => {
          showSuccess('Quét mã thành công! Đã tham gia gia đình.');
          sessionStorage.removeItem('sonha_pending_join_hh');
          sessionStorage.removeItem('sonha_pending_invite_token');
          try {
            localStorage.removeItem('sonha_pending_join_hh');
            localStorage.removeItem('sonha_pending_invite_token');
          } catch (_) {}
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(err => {
          showError('Không thể tham gia qua mã mời', err.message);
          sessionStorage.removeItem('sonha_pending_join_hh');
          sessionStorage.removeItem('sonha_pending_invite_token');
          try {
            localStorage.removeItem('sonha_pending_join_hh');
            localStorage.removeItem('sonha_pending_invite_token');
          } catch (_) {}
        });
    }
  }, [user]);

  // Loading skeleton while initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-xs font-semibold text-slate-500">Đang khởi động Sổ Nhà...</p>
      </div>
    );
  }

  // Not signed in or no household selected
  if (!user || !household) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top sticky Navbar */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHouseholdPicker={() => {
          setHouseholdInitialTab('members');
          setIsHouseholdOpen(true);
        }}
        onOpenShareQR={() => {
          setHouseholdInitialTab('share_qr');
          setIsHouseholdOpen(true);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2.5 sm:p-4 pb-20 sm:pb-24">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToTransactions={() => setCurrentTab('transactions')}
            onNavigateToBudgets={() => setCurrentTab('budgets')}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenAccounts={() => setIsAccountsOpen(true)}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionList onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
        )}

        {currentTab === 'budgets' && <BudgetView />}

        {currentTab === 'reports' && <ReportView />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Quick Add Bottom Sheet / Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onOpenAccounts={() => setIsAccountsOpen(true)}
          onOpenCategories={() => setIsCategoriesOpen(true)}
          onOpenRecurring={() => setIsRecurringOpen(true)}
          onOpenGoals={() => setIsGoalsOpen(true)}
          onOpenHousehold={() => setIsHouseholdOpen(true)}
          onOpenSixJars={() => setIsSixJarsOpen(true)}
        />
      )}

      {/* Accounts & Wallets Modal */}
      {isAccountsOpen && <AccountsModal onClose={() => setIsAccountsOpen(false)} />}

      {/* Categories Modal */}
      {isCategoriesOpen && <CategoriesModal onClose={() => setIsCategoriesOpen(false)} />}

      {/* Recurring Rules Modal */}
      {isRecurringOpen && <RecurringRulesModal onClose={() => setIsRecurringOpen(false)} />}

      {/* Saving Goals Modal */}
      {isGoalsOpen && <GoalsView onClose={() => setIsGoalsOpen(false)} />}

      {/* Household Picker / Management Modal */}
      {isHouseholdOpen && (
        <HouseholdPickerModal 
          onClose={() => setIsHouseholdOpen(false)} 
          initialTab={householdInitialTab}
        />
      )}

      {/* 6 Jars Configuration Modal */}
      {isSixJarsOpen && <SixJarsConfigModal isOpen={isSixJarsOpen} onClose={() => setIsSixJarsOpen(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HouseholdProvider>
          <MainAppContent />
        </HouseholdProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
