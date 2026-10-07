import React, { useState } from 'react';
import { CalendarClock, Check, X, AlertCircle } from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { formatVND, getTodayStr } from '../../utils/formatters';
import { RecurringRule } from '../../types';

export const RecurringBanner: React.FC = () => {
  const { recurringRules, processRecurringRules, userRole } = useHousehold();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const today = getTodayStr();

  // Find active rules where nextDueDate <= today
  const dueRules = recurringRules.filter(
    rule => rule.active && rule.nextDueDate <= today && rule.lastProcessedDate !== today
  );

  if (dueRules.length === 0 || isDismissed) return null;

  const handleConfirmAll = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể xác nhận ghi nhận định kỳ.');
      return;
    }

    setIsProcessing(true);
    try {
      await processRecurringRules(dueRules);
      showSuccess(`Đã tự động ghi nhận ${dueRules.length} khoản định kỳ tới hạn.`);
    } catch (err) {
      showError('Lỗi ghi nhận định kỳ', err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const totalDueAmount = dueRules.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3.5 text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Khoản định kỳ tới hạn
            </h4>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
              Bạn có {dueRules.length} khoản định kỳ cần ghi nhận ({formatVND(totalDueAmount)})
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {dueRules.map(r => (
                <span
                  key={r.id}
                  className="inline-flex items-center text-[11px] font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900"
                >
                  {r.title}: {formatVND(r.amount)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 rounded-lg shrink-0"
          aria-label="Tạm ẩn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => setIsDismissed(true)}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 rounded-xl transition"
        >
          Để sau
        </button>
        <button
          onClick={handleConfirmAll}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isProcessing ? 'Đang ghi nhận...' : 'Xác nhận ghi nhận ngay'}</span>
        </button>
      </div>
    </div>
  );
};
