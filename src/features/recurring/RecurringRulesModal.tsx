import React, { useState } from 'react';
import { CalendarClock, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { RecurringRule, RecurringFrequency, TransactionType } from '../../types';
import { formatVND, getTodayStr } from '../../utils/formatters';

export const RecurringRulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { recurringRules, categories, accounts, addRecurringRule, updateRecurringRule, deleteRecurringRule, userRole } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(getTodayStr);

  const handleOpenAdd = () => {
    setSelectedRule(null);
    setTitle('');
    setAmountStr('');
    setType('expense');
    setCategoryId(categories.find(c => c.type === 'expense')?.id || '');
    setAccountId(accounts[0]?.id || '');
    setFrequency('monthly');
    setNextDueDate(getTodayStr());
    setIsEditing(true);
  };

  const handleOpenEdit = (rule: RecurringRule) => {
    setSelectedRule(rule);
    setTitle(rule.title);
    setAmountStr(String(rule.amount));
    setType(rule.type);
    setCategoryId(rule.categoryId);
    setAccountId(rule.accountId);
    setFrequency(rule.frequency);
    setNextDueDate(rule.nextDueDate);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thay đổi khoản định kỳ.');
      return;
    }

    const amt = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
    if (!title.trim() || amt <= 0) {
      showError('Vui lòng nhập tên và số tiền hợp lệ.');
      return;
    }

    try {
      if (selectedRule) {
        await updateRecurringRule(selectedRule.id, {
          title: title.trim(),
          amount: amt,
          type: type as 'expense' | 'income',
          categoryId,
          accountId,
          frequency,
          nextDueDate,
        });
        showSuccess('Đã cập nhật khoản định kỳ.');
      } else {
        await addRecurringRule({
          title: title.trim(),
          amount: amt,
          type: type as 'expense' | 'income',
          categoryId: categoryId || categories[0]?.id || '',
          accountId: accountId || accounts[0]?.id || '',
          frequency,
          nextDueDate,
          active: true,
        });
        showSuccess('Đã thêm khoản định kỳ mới.');
      }
      setIsEditing(false);
    } catch (err) {
      showError('Lỗi cập nhật', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Khoản Thu Chi Định Kỳ
              </h2>
              <p className="text-xs text-slate-400">Tiền điện, nước, internet, lương hàng tháng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto py-4 space-y-3 flex-1">
          <div className="flex justify-end">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm khoản định kỳ</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {recurringRules.map(rule => {
              const cat = categories.find(c => c.id === rule.categoryId);
              return (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rule.title}</h4>
                    <p className="text-xs text-slate-500">
                      {formatVND(rule.amount)} • {rule.frequency === 'monthly' ? 'Hàng tháng' : rule.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng năm'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Kỳ tiếp theo: {rule.nextDueDate} {rule.lastProcessedDate && `(Đã ghi nhận: ${rule.lastProcessedDate})`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecurringRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isEditing && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedRule ? 'Sửa khoản định kỳ' : 'Thêm khoản định kỳ mới'}
                </h4>
                <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} noValidate className="mt-3 space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Tên khoản định kỳ</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tiền điện hàng tháng, Tiền nhà..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Số tiền (VND)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountStr ? parseInt(amountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                    onChange={e => setAmountStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Chu kỳ lặp</label>
                    <select
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as RecurringFrequency)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="monthly">Hàng tháng</option>
                      <option value="weekly">Hàng tuần</option>
                      <option value="yearly">Hàng năm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Ngày tới hạn</label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={e => setNextDueDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold shadow-xs"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
