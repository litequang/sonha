import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Database, 
  Trash2, 
  LogOut, 
  Sparkles, 
  X, 
  Check, 
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Users,
  Tag,
  Wallet,
  CalendarClock,
  Target,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { 
  getDeviceTrustPreference, 
  setDeviceTrustPreference, 
  clearOfflineData 
} from '../../lib/firebase/config';
import { 
  exportTransactionsToCSV, 
  exportHouseholdBackupJSON, 
  validateImportedBackup 
} from '../../utils/exportImport';
import { seedDemoTransactions, clearDemoData } from '../../utils/seedData';
import { HouseholdBackupData } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
  onOpenAccounts: () => void;
  onOpenCategories: () => void;
  onOpenRecurring: () => void;
  onOpenGoals: () => void;
  onOpenHousehold: () => void;
  onOpenSixJars: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onOpenAccounts,
  onOpenCategories,
  onOpenRecurring,
  onOpenGoals,
  onOpenHousehold,
  onOpenSixJars,
}) => {
  const { user, logout } = useAuth();
  const { 
    household, 
    members, 
    transactions, 
    categories, 
    accounts, 
    budgets, 
    recurringRules, 
    goals, 
    userRole,
    restoreHouseholdBackup,
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [deviceTrust, setDeviceTrust] = useState<'personal' | 'shared'>(() => {
    return getDeviceTrustPreference() || 'personal';
  });

  const [isSeeding, setIsSeeding] = useState(false);
  const [importPreview, setImportPreview] = useState<HouseholdBackupData | null>(null);

  const handleDeviceTrustChange = (pref: 'personal' | 'shared') => {
    setDeviceTrust(pref);
    setDeviceTrustPreference(pref);
    showSuccess(`Đã lưu tùy chọn: ${pref === 'personal' ? 'Thiết bị cá nhân' : 'Thiết bị dùng chung'}`);
  };

  const handleClearCache = async () => {
    if (!confirm('Bạn có chắc muốn xóa dữ liệu offline trên trình duyệt này? Dữ liệu trên đám mây Firebase của gia đình vẫn an toàn.')) {
      return;
    }
    await clearOfflineData();
    showSuccess('Đã xóa dữ liệu bộ nhớ đệm offline.');
    setTimeout(() => window.location.reload(), 800);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showError('Chưa có giao dịch nào để xuất CSV.');
      return;
    }
    exportTransactionsToCSV(transactions, categories, accounts, household?.name || 'giadinh');
    showSuccess('Đã tải xuống tệp CSV giao dịch.');
  };

  const handleExportJSON = () => {
    if (!household) return;
    const backup: HouseholdBackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      household,
      members,
      accounts,
      categories,
      transactions,
      budgets,
      recurringRules,
      goals,
    };
    exportHouseholdBackupJSON(backup);
    showSuccess('Đã tải xuống bản sao lưu toàn bộ dữ liệu gia đình.');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const validated = validateImportedBackup(parsed);
        if (!validated.valid || !validated.data) {
          showError('Tệp không hợp lệ', validated.error);
          return;
        }
        setImportPreview(validated.data);
      } catch {
        showError('Không thể đọc tệp JSON. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!importPreview) return;
    setIsRestoring(true);
    try {
      const res = await restoreHouseholdBackup(importPreview);
      showSuccess(
        `Phục hồi thành công ${res.txCount} giao dịch, ${res.categoriesCount} danh mục, ${res.accountsCount} tài khoản!`
      );
      setImportPreview(null);
    } catch (err) {
      showError('Lỗi phục hồi dữ liệu', err instanceof Error ? err.message : String(err));
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [isClearingDemo, setIsClearingDemo] = useState(false);

  const handleSeedDemoData = async () => {
    if (!household || !user) return;
    setIsSeeding(true);
    try {
      const count = await seedDemoTransactions(household.id, user.uid);
      showSuccess(`Đã khởi tạo thành công ${count} giao dịch và ngân sách mẫu!`);
    } catch (err) {
      showError('Lỗi tạo dữ liệu mẫu', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!household) return;
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể xóa dữ liệu.');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ giao dịch, mục tiêu và khoản định kỳ mẫu (demo) khỏi sổ gia đình?')) {
      return;
    }
    setIsClearingDemo(true);
    try {
      const res = await clearDemoData(household.id);
      if (res.deletedTx > 0 || res.deletedGoals > 0 || res.deletedRules > 0) {
        showSuccess(`Đã xóa thành công ${res.deletedTx} giao dịch mẫu, ${res.deletedGoals} mục tiêu mẫu!`);
      } else {
        showSuccess('Không tìm thấy dữ liệu mẫu nào trong sổ gia đình.');
      }
    } catch (err) {
      showError('Lỗi xóa dữ liệu mẫu', err instanceof Error ? err.message : String(err));
    } finally {
      setIsClearingDemo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Cài Đặt & Dữ Liệu</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
          {/* Quick Management Shortcuts */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quản lý chi tiết
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onClose(); onOpenSixJars(); }}
                className="col-span-2 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 flex items-center justify-between hover:border-indigo-400 transition text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Phân bổ tài chính (6 Lọ / Tùy chỉnh)</span>
                    <span className="text-[10px] text-slate-500">Tùy biến tỷ lệ % các danh mục và tự động chia ngân sách</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">55/10/10/10/10/5</span>
              </button>

              <button
                onClick={() => { onClose(); onOpenAccounts(); }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 hover:bg-slate-100 transition text-left"
              >
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Tài khoản & ví</span>
              </button>

              <button
                onClick={() => { onClose(); onOpenCategories(); }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 hover:bg-slate-100 transition text-left"
              >
                <Tag className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Danh mục thu chi</span>
              </button>

              <button
                onClick={() => { onClose(); onOpenRecurring(); }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 hover:bg-slate-100 transition text-left"
              >
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Khoản định kỳ</span>
              </button>

              <button
                onClick={() => { onClose(); onOpenGoals(); }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 hover:bg-slate-100 transition text-left"
              >
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Mục tiêu tiết kiệm</span>
              </button>
            </div>
          </div>

          {/* Device Trust & Offline Settings */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Quyền riêng tư & Bộ nhớ Offline</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Chọn cách lưu dữ liệu trên trình duyệt này:
            </p>

            <div className="space-y-1.5">
              <label className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="trustPref"
                  checked={deviceTrust === 'personal'}
                  onChange={() => handleDeviceTrustChange('personal')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Thiết bị cá nhân (Khuyên dùng)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Bật lưu cache offline. Khi mất mạng vẫn xem và nhập thu chi bình thường.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="trustPref"
                  checked={deviceTrust === 'shared'}
                  onChange={() => handleDeviceTrustChange('shared')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Thiết bị công cộng / Dùng chung
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Chỉ lưu tạm trên RAM, không lưu vĩnh viễn trên ổ đĩa để bảo mật.
                  </p>
                </div>
              </label>
            </div>

            <button
              onClick={handleClearCache}
              className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition text-[11px] font-semibold"
            >
              Xóa dữ liệu offline khỏi thiết bị này
            </button>
          </div>

          {/* Export & Backup Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Xuất & Sao lưu dữ liệu</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Tải toàn bộ số liệu về máy tính/điện thoại hoặc sao lưu để lưu trữ an toàn.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-slate-400 transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất Excel/CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold hover:border-slate-400 transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Sao lưu JSON đầy đủ</span>
              </button>
            </div>

            {/* Restore / Import Section */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Phục hồi dữ liệu (Restore)</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Khôi phục lại giao dịch, tài khoản, danh mục, ngân sách và mục tiêu từ tệp JSON đã sao lưu trước đó.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileImport}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-center gap-2 shadow-2xs active:scale-98"
              >
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Chọn tệp sao lưu JSON để phục hồi</span>
              </button>
            </div>
          </div>

          {/* Developer / Demo Seed Data */}
          <div className="p-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Dữ liệu mẫu kiểm thử (Demo Data)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Nạp ~20 giao dịch mẫu Việt Nam, 3 tài khoản, ngân sách và mục tiêu để trải nghiệm Dashboard, hoặc dọn sạch sau khi kiểm thử xong.
            </p>
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={isSeeding || isClearingDemo}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isSeeding ? 'Đang tạo...' : 'Nạp dữ liệu mẫu'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearDemoData}
                disabled={isSeeding || isClearingDemo}
                className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                title="Xóa tất cả các giao dịch, mục tiêu và khoản định kỳ mẫu"
              >
                {isClearingDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                <span>{isClearingDemo ? 'Đang xóa...' : 'Xóa dữ liệu mẫu'}</span>
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2">
            <button
              onClick={() => { logout(); onClose(); }}
              className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Preview & Confirmation Dialog */}
      {importPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Xác nhận phục hồi dữ liệu
                  </h3>
                  <p className="text-[10px] text-slate-400">Kiểm tra thông tin bản sao lưu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Backup Summary Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Tên sổ gia đình:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {importPreview.household?.name || 'Gia đình'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Thời gian tạo bản sao:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px]">
                  {importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleString('vi-VN') : 'Không rõ'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Giao dịch</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {importPreview.transactions?.length || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Danh mục</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {importPreview.categories?.length || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Tài khoản & Ví</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {importPreview.accounts?.length || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Ngân sách & Mục tiêu</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {(importPreview.budgets?.length || 0) + (importPreview.goals?.length || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Toàn bộ dữ liệu trong tệp sẽ được nạp và gộp an toàn vào sổ <strong>{household?.name}</strong>.
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                disabled={isRestoring}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang phục hồi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận phục hồi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
