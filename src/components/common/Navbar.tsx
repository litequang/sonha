import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Settings as SettingsIcon,
  Home,
  Check,
  QrCode
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useAuth } from '../../hooks/useAuth';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { formatMonthYear, formatShortMonthYear, getPreviousMonthStr, getNextMonthStr } from '../../utils/formatters';
import { PWAInstallButton } from './PWAInstallModal';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenHouseholdPicker: () => void;
  onOpenShareQR?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenSettings, 
  onOpenHouseholdPicker,
  onOpenShareQR 
}) => {
  const { household, currentMonth, setCurrentMonth } = useHousehold();
  const { user } = useAuth();
  const syncStatus = useSyncStatus();
  const [showSyncInfo, setShowSyncInfo] = useState(false);

  const handlePrevMonth = () => {
    setCurrentMonth(getPreviousMonthStr(currentMonth));
  };

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonthStr(currentMonth));
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-2.5 sm:px-4 py-2 sm:py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Brand & Household */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <button
            onClick={onOpenHouseholdPicker}
            className="flex items-center gap-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 px-1.5 sm:px-2 py-1 rounded-lg transition min-w-0 group"
            title="Đổi hoặc quản lý gia đình"
          >
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[76px] min-[390px]:max-w-[110px] sm:max-w-[160px]">
              {household?.name || 'Sổ Nhà'}
            </span>
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
          </button>

          {/* Quick QR Share button (icon-only on mobile) */}
          <button
            onClick={onOpenShareQR || onOpenHouseholdPicker}
            className="p-1.5 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 transition flex items-center gap-1 shrink-0"
            title="Mã QR chia sẻ gia đình"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-bold">Mã QR</span>
          </button>
        </div>

        {/* Center: Month Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1 sm:p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="px-1.5 sm:px-2 py-0.5 text-slate-800 dark:text-slate-200 whitespace-nowrap text-center text-xs font-bold min-w-[58px] sm:min-w-[100px]">
            <span className="sm:hidden">{formatShortMonthYear(currentMonth)}</span>
            <span className="hidden sm:inline">{formatMonthYear(currentMonth)}</span>
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 sm:p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Right: Sync Status & Settings Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <PWAInstallButton compact />

          {/* Sync indicator (compact icon on mobile) */}
          <div className="relative">
            <button
              onClick={() => setShowSyncInfo(!showSyncInfo)}
              className={`flex items-center justify-center p-1.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-full text-xs font-medium transition ${
                syncStatus.state === 'offline'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : syncStatus.state === 'syncing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}
              title="Trạng thái kết nối & đồng bộ dữ liệu"
            >
              {syncStatus.state === 'offline' ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline ml-1">Offline</span>
                </>
              ) : syncStatus.state === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span className="hidden sm:inline ml-1">Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline ml-1">Đã sync</span>
                </>
              )}
            </button>

            {/* Sync status info popover */}
            {showSyncInfo && (
              <div className="absolute right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white mb-1">
                  {syncStatus.isOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{syncStatus.label}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {syncStatus.isOnline
                    ? 'Dữ liệu được đồng bộ liên tục với Firebase Cloud Firestore. Hoàn toàn hoạt động trên gói Spark miễn phí.'
                    : 'Bạn đang không có kết nối mạng. Bạn vẫn có thể thêm/sửa chi tiêu bình thường, hệ thống sẽ tự động đồng bộ khi có Internet.'}
                </p>
                <button
                  onClick={() => setShowSyncInfo(false)}
                  className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Cài đặt và tài khoản"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
