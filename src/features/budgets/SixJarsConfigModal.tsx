import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  X, 
  Layers, 
  Calculator, 
  ShieldCheck,
  ArrowRight,
  Plus,
  SlidersHorizontal
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { JarType } from '../../types';
import { SIX_JARS, getJarInfo, getJarDisplayName } from '../../utils/defaultData';
import { formatVND, formatMonthYear } from '../../utils/formatters';

interface SixJarsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'allocate' | 'config' | 'names';
}

export const SixJarsConfigModal: React.FC<SixJarsConfigModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'allocate' 
}) => {
  const { 
    household, 
    currentMonth, 
    transactions, 
    updateJarsConfig, 
    updateJarCustomNames,
    autoAllocateSixJarsBudget, 
    adjustBudget,
    normalizeSixJarsCategories,
    userRole 
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  // Active tab: 'allocate' (Chia ngân sách), 'config' (Tỷ lệ %), or 'names' (Đổi tên lọ)
  const [activeTab, setActiveTab] = useState<'allocate' | 'config' | 'names'>(initialTab);

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Allocation mode in Tab 1: 'all' (chia đủ 6 lọ theo tỷ lệ) vs 'single' (thêm riêng 1 lọ)
  const [allocateMode, setAllocateMode] = useState<'all' | 'single'>('all');
  const [singleJarTarget, setSingleJarTarget] = useState<JarType>('GIVE');
  const [singleJarAmountStr, setSingleJarAmountStr] = useState<string>('500000');
  const [singleJarSyncOverall, setSingleJarSyncOverall] = useState<boolean>(true);
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // Total income for current month
  const actualIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const [targetIncomeStr, setTargetIncomeStr] = useState<string>(() => {
    return actualIncome > 0 ? String(actualIncome) : '25000000';
  });

  // Jars custom percentages
  const [percentages, setPercentages] = useState<Record<JarType, number>>(() => {
    return (
      household?.jarsConfig || {
        NEC: 55,
        FFA: 10,
        LTSS: 10,
        EDU: 10,
        PLAY: 10,
        GIVE: 5,
      }
    );
  });

  // Jars custom display names
  const [customNames, setCustomNames] = useState<Record<JarType, string>>(() => {
    return {
      NEC: household?.jarCustomNames?.NEC || SIX_JARS.NEC.shortName,
      FFA: household?.jarCustomNames?.FFA || SIX_JARS.FFA.shortName,
      LTSS: household?.jarCustomNames?.LTSS || SIX_JARS.LTSS.shortName,
      EDU: household?.jarCustomNames?.EDU || SIX_JARS.EDU.shortName,
      PLAY: household?.jarCustomNames?.PLAY || SIX_JARS.PLAY.shortName,
      GIVE: household?.jarCustomNames?.GIVE || SIX_JARS.GIVE.shortName,
    };
  });

  // Sync state when household changes
  useEffect(() => {
    if (household?.jarsConfig) {
      setPercentages(household.jarsConfig);
    }
    if (household?.jarCustomNames) {
      setCustomNames({
        NEC: household.jarCustomNames.NEC || SIX_JARS.NEC.shortName,
        FFA: household.jarCustomNames.FFA || SIX_JARS.FFA.shortName,
        LTSS: household.jarCustomNames.LTSS || SIX_JARS.LTSS.shortName,
        EDU: household.jarCustomNames.EDU || SIX_JARS.EDU.shortName,
        PLAY: household.jarCustomNames.PLAY || SIX_JARS.PLAY.shortName,
        GIVE: household.jarCustomNames.GIVE || SIX_JARS.GIVE.shortName,
      });
    }
  }, [household]);

  const [isAllocating, setIsAllocating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingNames, setIsSavingNames] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  if (!isOpen) return null;

  const totalPercentage = Object.values(percentages).reduce((sum, val) => sum + (val || 0), 0);
  const isPercentValid = totalPercentage === 100;

  const targetIncome = parseInt(targetIncomeStr.replace(/\D/g, ''), 10) || 0;
  const singleJarAmount = parseInt(singleJarAmountStr.replace(/\D/g, ''), 10) || 0;

  const handlePercentageChange = (jarKey: JarType, val: string) => {
    const num = Math.max(0, Math.min(100, parseInt(val.replace(/\D/g, ''), 10) || 0));
    setPercentages(prev => ({ ...prev, [jarKey]: num }));
  };

  const handleSaveConfig = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể sửa cấu hình.');
      return;
    }
    if (!isPercentValid) {
      showError(`Tổng tỷ lệ các lọ là ${totalPercentage}%. Cần cân đối đủ 100%.`);
      return;
    }
    setIsSavingConfig(true);
    try {
      await updateJarsConfig(percentages);
      showSuccess('Đã lưu tỷ lệ 6 lọ cho gia đình.');
    } catch (err) {
      showError('Không thể lưu', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveNames = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể đổi tên lọ.');
      return;
    }
    setIsSavingNames(true);
    try {
      await updateJarCustomNames(customNames);
      showSuccess('Đã cập nhật tên gọi tùy biến cho các lọ!');
    } catch (err) {
      showError('Không thể lưu tên lọ', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingNames(false);
    }
  };

  const handleResetNames = () => {
    setCustomNames({
      NEC: SIX_JARS.NEC.shortName,
      FFA: SIX_JARS.FFA.shortName,
      LTSS: SIX_JARS.LTSS.shortName,
      EDU: SIX_JARS.EDU.shortName,
      PLAY: SIX_JARS.PLAY.shortName,
      GIVE: SIX_JARS.GIVE.shortName,
    });
  };

  const handleAutoAllocate = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể đặt ngân sách.');
      return;
    }
    if (targetIncome <= 0) {
      showError('Vui lòng nhập thu nhập dự kiến lớn hơn 0đ.');
      return;
    }
    if (!isPercentValid) {
      showError(`Tổng tỷ lệ các lọ là ${totalPercentage}%. Cần cân đối đủ 100%.`);
      return;
    }

    setIsAllocating(true);
    try {
      await autoAllocateSixJarsBudget(currentMonth, targetIncome, percentages);
      showSuccess(`Đã đặt hạn mức 6 lọ cho ${formatMonthYear(currentMonth)}!`);
      onClose();
    } catch (err) {
      showError('Lỗi đặt ngân sách', err instanceof Error ? err.message : String(err));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleSingleJarAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thêm ngân sách.');
      return;
    }
    if (singleJarAmount <= 0) {
      showError('Vui lòng nhập số tiền muốn cộng thêm lớn hơn 0đ.');
      return;
    }

    setIsAddingSingle(true);
    try {
      await adjustBudget(currentMonth, `jar_${singleJarTarget}`, singleJarAmount, singleJarSyncOverall);
      const targetName = getJarDisplayName(singleJarTarget, household?.jarCustomNames);
      showSuccess(`Đã cộng thêm ${formatVND(singleJarAmount)} riêng cho Lọ ${targetName}!`);
      onClose();
    } catch (err) {
      showError('Lỗi thêm ngân sách', err instanceof Error ? err.message : String(err));
    } finally {
      setIsAddingSingle(false);
    }
  };

  const handleNormalizeCategories = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể tạo danh mục.');
      return;
    }
    setIsNormalizing(true);
    try {
      const added = await normalizeSixJarsCategories();
      if (added > 0) {
        showSuccess(`Đã tạo ${added} danh mục chuẩn 6 lọ!`);
      } else {
        showSuccess('Đã có đầy đủ danh mục chuẩn 6 lọ.');
      }
    } catch (err) {
      showError('Lỗi tạo danh mục', err instanceof Error ? err.message : String(err));
    } finally {
      setIsNormalizing(false);
    }
  };

  const jarKeys: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Cấu hình 6 Lọ
              </h2>
              <p className="text-[11px] text-slate-400">
                Phân bổ ngân sách chi tiêu
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold my-2.5">
          <button
            onClick={() => setActiveTab('allocate')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'allocate'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Chia ngân sách
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'config'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tỷ lệ %
          </button>
          <button
            onClick={() => setActiveTab('names')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'names'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Đổi tên lọ
          </button>
        </div>

        {/* Tab 1: Budget Allocation (Chia cả 6 lọ HOẶC Thêm riêng 1 lọ) */}
        {activeTab === 'allocate' && (
          <div className="overflow-y-auto space-y-3 flex-1 text-xs pr-1">
            {/* Sub-mode selector */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setAllocateMode('all')}
                className={`flex-1 py-1 rounded-md transition ${
                  allocateMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Chia đủ 6 lọ theo tỷ lệ
              </button>
              <button
                type="button"
                onClick={() => setAllocateMode('single')}
                className={`flex-1 py-1 rounded-md transition ${
                  allocateMode === 'single'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                + Thêm riêng 1 lọ
              </button>
            </div>

            {/* Mode A: Phân bổ toàn bộ 6 lọ theo tỷ lệ */}
            {allocateMode === 'all' && (
              <div className="space-y-3">
                {/* Target Income Input */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Thu nhập phân bổ ({formatMonthYear(currentMonth)})
                    </label>
                    {actualIncome > 0 && (
                      <button
                        type="button"
                        onClick={() => setTargetIncomeStr(String(actualIncome))}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                      >
                        Theo thực tế ({formatVND(actualIncome)})
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={targetIncome > 0 ? targetIncome.toLocaleString('vi-VN') : ''}
                      onChange={e => setTargetIncomeStr(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      đ
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Tự động tính hạn mức từng lọ theo tỷ lệ %.
                  </p>
                </div>

                {/* Allocated Breakdown Preview */}
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    Phân bổ dự kiến
                  </h3>

                  <div className="space-y-1">
                    {jarKeys.map(key => {
                      const jar = getJarInfo(key, household?.jarCustomNames);
                      const pct = percentages[key] || 0;
                      const allocatedAmount = Math.round((targetIncome * pct) / 100);

                      return (
                        <div
                          key={key}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: jar.color }}
                            />
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {jar.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {pct}%
                            </span>
                          </div>

                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatVND(allocatedAmount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Normalize categories helper */}
                <div className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                      22 danh mục chuẩn
                    </p>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                      Tạo đủ danh mục chi tiêu gán sẵn 6 lọ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNormalizeCategories}
                    disabled={isNormalizing}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shrink-0 transition"
                  >
                    {isNormalizing ? 'Đang tạo...' : 'Tạo danh mục'}
                  </button>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={handleAutoAllocate}
                  disabled={isAllocating || targetIncome <= 0 || !isPercentValid}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {isAllocating ? 'Đang áp dụng...' : `Áp dụng ngân sách ${currentMonth}`}
                </button>
              </div>
            )}

            {/* Mode B: Thêm riêng ngân sách 1 lọ (Không chia lại) */}
            {allocateMode === 'single' && (
              <form onSubmit={handleSingleJarAdd} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold mb-0.5">✨ Tăng ngân sách độc lập</p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10.5px]">
                    Khoản tiền bạn nhập sẽ được cộng trực tiếp vào chiếc lọ này mà không làm ảnh hưởng hay chia lại tỷ lệ của các lọ khác.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn chiếc lọ muốn tăng ngân sách
                  </label>
                  <select
                    value={singleJarTarget}
                    onChange={e => setSingleJarTarget(e.target.value as JarType)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                  >
                    {jarKeys.map(k => {
                      const jar = getJarInfo(k, household?.jarCustomNames);
                      return (
                        <option key={k} value={k}>
                          🏺 Lọ {jar.name} ({percentages[k] || jar.percent}%)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số tiền muốn cộng thêm (+đ)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="500.000"
                      value={singleJarAmount > 0 ? singleJarAmount.toLocaleString('vi-VN') : ''}
                      onChange={e => setSingleJarAmountStr(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      đ
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[200000, 500000, 1000000, 2000000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSingleJarAmountStr(String(amt))}
                        className="py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-[10px] transition"
                      >
                        +{formatVND(amt).replace('₫', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sync with Overall Budget Checkbox */}
                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleJarSyncOverall}
                    onChange={e => setSingleJarSyncOverall(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    Đồng thời tăng <strong>Ngân sách tổng của tháng</strong> thêm số tiền này
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isAddingSingle || singleJarAmount <= 0}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {isAddingSingle ? 'Đang cập nhật...' : `+ Cộng ${formatVND(singleJarAmount)} vào Lọ ${getJarDisplayName(singleJarTarget, household?.jarCustomNames)}`}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Custom Percentages */}
        {activeTab === 'config' && (
          <div className="overflow-y-auto space-y-3 flex-1 text-xs pr-1">
            {/* Inputs for 6 Jars */}
            <div className="space-y-1.5">
              {jarKeys.map(key => {
                const jar = getJarInfo(key, household?.jarCustomNames);
                return (
                  <div
                    key={key}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: jar.color }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white truncate block text-xs">
                          {jar.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {jar.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={percentages[key] !== undefined ? percentages[key] : ''}
                        onChange={e => handlePercentageChange(key, e.target.value)}
                        className="w-12 p-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-bold text-xs"
                      />
                      <span className="font-bold text-slate-500 text-xs">%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Indicator */}
            <div
              className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isPercentValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}
            >
              <span>Tổng: {totalPercentage}%</span>
              <span className="text-[11px]">
                {isPercentValid
                  ? 'Đạt 100%'
                  : 100 - totalPercentage > 0
                  ? `Thiếu ${100 - totalPercentage}%`
                  : `Thừa ${totalPercentage - 100}%`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSavingConfig || !isPercentValid}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
            >
              {isSavingConfig ? 'Đang lưu...' : 'Lưu tỷ lệ'}
            </button>
          </div>
        )}

        {/* Tab 3: Custom Jar Names */}
        {activeTab === 'names' && (
          <div className="overflow-y-auto space-y-3 flex-1 text-xs pr-1">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Đặt tên riêng cho từng chiếc lọ theo phong cách và thói quen của gia đình bạn (ví dụ: thay vì <strong>Cho đi</strong> thì đặt là <strong>Dâng hiến</strong> hoặc <strong>Thiện nguyện</strong>).
              </p>
            </div>

            <div className="space-y-2">
              {jarKeys.map(key => {
                const jar = SIX_JARS[key];
                return (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: jar.color }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {key} ({percentages[key] || jar.percent}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Gốc: {jar.shortName}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder={jar.shortName}
                      value={customNames[key] || ''}
                      onChange={e =>
                        setCustomNames(prev => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />

                    {customNames[key]?.trim() && customNames[key]?.trim() !== jar.shortName && (
                      <div className="flex items-center gap-1.5 text-[10.5px]">
                        <span className="text-slate-400">Xem trước:</span>
                        <span 
                          className="px-2 py-0.5 rounded-md font-bold text-white shadow-2xs"
                          style={{ backgroundColor: jar.color }}
                        >
                          🏺 {customNames[key].trim()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetNames}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition"
              >
                Đặt lại mặc định
              </button>

              <button
                type="button"
                onClick={handleSaveNames}
                disabled={isSavingNames}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
              >
                {isSavingNames ? 'Đang lưu...' : 'Lưu tên tùy biến'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
