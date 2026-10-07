import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Trash2, Edit2, X, PiggyBank, CreditCard } from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { SavingGoal } from '../../types';
import { formatVND } from '../../utils/formatters';

export const GoalsView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { goals, addGoal, updateGoal, deleteGoal, userRole } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [filterType, setFilterType] = useState<'all' | 'saving' | 'debt'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);

  const [name, setName] = useState('');
  const [isDebt, setIsDebt] = useState(false);
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#059669');

  const [actionGoal, setActionGoal] = useState<SavingGoal | null>(null);
  const [actionAmountStr, setActionAmountStr] = useState('');

  // Summaries
  let totalSaved = 0;
  let totalDebtRemaining = 0;
  goals.forEach(g => {
    if (g.isDebt) {
      totalDebtRemaining += Math.max(0, g.targetAmount - g.currentAmount);
    } else {
      totalSaved += g.currentAmount;
    }
  });

  const filteredGoals = goals.filter(g => {
    if (filterType === 'saving') return !g.isDebt;
    if (filterType === 'debt') return g.isDebt;
    return true;
  });

  const handleOpenAdd = (defaultAsDebt: boolean = false) => {
    setEditingGoal(null);
    setName('');
    setIsDebt(defaultAsDebt);
    setTargetAmountStr('');
    setCurrentAmountStr('0');
    setTargetDate('');
    setColor(defaultAsDebt ? '#E11D48' : '#059669');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setIsDebt(Boolean(goal.isDebt));
    setTargetAmountStr(String(goal.targetAmount));
    setCurrentAmountStr(String(goal.currentAmount));
    setTargetDate(goal.targetDate || '');
    setColor(goal.color || (goal.isDebt ? '#E11D48' : '#059669'));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thay đổi mục tiêu.');
      return;
    }

    const targetNum = parseInt(targetAmountStr.replace(/\D/g, ''), 10) || 0;
    const currentNum = parseInt(currentAmountStr.replace(/\D/g, ''), 10) || 0;

    if (!name.trim()) {
      showError(isDebt ? 'Vui lòng nhập tên khoản nợ.' : 'Vui lòng nhập tên mục tiêu tiết kiệm.');
      return;
    }
    if (targetNum <= 0) {
      showError(isDebt ? 'Tổng số tiền nợ gốc phải lớn hơn 0đ.' : 'Số tiền mục tiêu phải lớn hơn 0đ.');
      return;
    }

    try {
      const payload: any = {
        name: name.trim(),
        targetAmount: targetNum,
        currentAmount: currentNum,
        color,
        isDebt,
      };
      if (targetDate) {
        payload.targetDate = targetDate;
      }

      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
        showSuccess(isDebt ? 'Đã cập nhật kế hoạch trả nợ.' : 'Đã cập nhật mục tiêu.');
      } else {
        await addGoal(payload);
        showSuccess(isDebt ? 'Đã tạo kế hoạch trả nợ mới.' : 'Đã thêm mục tiêu tiết kiệm mới.');
      }
      setIsModalOpen(false);
    } catch (err) {
      showError('Lỗi cập nhật', err instanceof Error ? err.message : String(err));
    }
  };

  const handleRecordAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionGoal) return;
    const addVal = parseInt(actionAmountStr.replace(/\D/g, ''), 10) || 0;
    if (addVal <= 0) return;

    try {
      await updateGoal(actionGoal.id, {
        currentAmount: actionGoal.currentAmount + addVal,
      });
      showSuccess(
        actionGoal.isDebt
          ? `Đã ghi nhận trả ${formatVND(addVal)} cho khoản nợ "${actionGoal.name}"!`
          : `Đã tích lũy thêm ${formatVND(addVal)} vào mục tiêu "${actionGoal.name}"!`
      );
      setActionGoal(null);
      setActionAmountStr('');
    } catch (err) {
      showError('Lỗi cập nhật', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mục Tiêu & Kế Hoạch Trả Nợ
              </h2>
              <p className="text-xs text-slate-400">Tích lũy tài chính và theo dõi xóa nợ gia đình</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-3 flex-1 text-xs">
          {/* Top Summary Box */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Đã tích lũy tiết kiệm</span>
              <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatVND(totalSaved)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Dư nợ còn phải trả</span>
              <span className="block text-sm font-bold text-rose-600 dark:text-rose-400 truncate">
                {totalDebtRemaining > 0 ? `-${formatVND(totalDebtRemaining)}` : '0đ (Không nợ)'}
              </span>
            </div>
          </div>

          {/* Action Row: Tabs & Add Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Tất cả ({goals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('saving')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  filterType === 'saving'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                <span>🎯 Tiết kiệm</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('debt')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  filterType === 'debt'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                <span>💳 Kế hoạch trả nợ</span>
              </button>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex items-center gap-1.5 justify-end">
              <button
                onClick={() => handleOpenAdd(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-semibold text-xs hover:bg-rose-100 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>+ Thêm khoản nợ</span>
              </button>
              <button
                onClick={() => handleOpenAdd(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm tiết kiệm</span>
              </button>
            </div>
          </div>

          {/* Goal & Debt Cards List */}
          {filteredGoals.length > 0 ? (
            <div className="space-y-3">
              {filteredGoals.map(goal => {
                const isDebtPlan = Boolean(goal.isDebt);
                const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                const isCompleted = goal.currentAmount >= goal.targetAmount;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                return (
                  <div
                    key={goal.id}
                    className={`p-3.5 rounded-2xl border space-y-2 transition ${
                      isDebtPlan
                        ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: goal.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {goal.name}
                            </h4>
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                                isDebtPlan
                                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isDebtPlan ? '💳 Kế hoạch trả nợ' : '🎯 Mục tiêu tích lũy'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setActionGoal(goal);
                            setActionAmountStr('');
                          }}
                          className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                            isDebtPlan
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={isDebtPlan ? 'Ghi nhận vừa trả thêm một khoản nợ' : 'Tích lũy thêm tiền'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isDebtPlan ? 'Trả nợ' : 'Tích lũy'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(goal)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(percent, 100)}%`,
                          backgroundColor: goal.color || (isDebtPlan ? '#E11D48' : '#059669'),
                        }}
                      />
                    </div>

                    {/* Status Text */}
                    <div className="flex items-center justify-between text-xs">
                      {isDebtPlan ? (
                        <>
                          <span className="text-slate-500">
                            Còn nợ: <strong className="text-rose-600 dark:text-rose-400 font-bold">{formatVND(remaining)}</strong>
                          </span>
                          <span className="text-slate-500">
                            Đã trả: <strong className="text-slate-800 dark:text-slate-200">{formatVND(goal.currentAmount)}</strong> ({percent.toFixed(0)}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500">
                            Đã có: <strong className="text-slate-800 dark:text-slate-200">{formatVND(goal.currentAmount)}</strong> ({percent.toFixed(0)}%)
                          </span>
                          <span className="text-slate-500">
                            Mục tiêu: <strong className="text-slate-800 dark:text-slate-200">{formatVND(goal.targetAmount)}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {isCompleted && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDebtPlan ? '🎉 Tuyệt vời! Bạn đã tất toán dứt điểm khoản nợ này!' : '🎉 Chúc mừng gia đình đã đạt được mục tiêu này!'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              {filterType === 'debt'
                ? 'Chưa có kế hoạch trả nợ nào. Bạn có thể nhấn "+ Thêm khoản nợ" để theo dõi lịch trả.'
                : 'Chưa có mục tiêu nào được tạo.'}
            </div>
          )}
        </div>

        {/* Record Payment / Deposit Action Modal */}
        {actionGoal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                {actionGoal.isDebt ? <CreditCard className="w-4 h-4 text-rose-600" /> : <PiggyBank className="w-4 h-4 text-emerald-600" />}
                <span>{actionGoal.isDebt ? 'Ghi nhận trả nợ' : 'Nạp tiền tích lũy'}</span>
              </h4>
              <p className="text-slate-500 mb-3 text-[11px]">
                {actionGoal.isDebt
                  ? `Nhập số tiền vừa trả cho khoản nợ "${actionGoal.name}":`
                  : `Nhập số tiền tích lũy vào "${actionGoal.name}":`}
              </p>
              <form onSubmit={handleRecordAction} noValidate className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="Nhập số tiền..."
                  value={actionAmountStr ? parseInt(actionAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                  onChange={e => setActionAmountStr(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-base"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActionGoal(null)}
                    className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-1.5 rounded-xl text-white font-semibold shadow-xs ${
                      actionGoal.isDebt ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {actionGoal.isDebt ? 'Cập nhật trả nợ' : 'Cộng tiền'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Goal Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingGoal ? 'Chỉnh sửa' : isDebt ? 'Tạo kế hoạch trả nợ' : 'Mục tiêu tích lũy mới'}
                </h4>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-3">
                {/* Type Switcher */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Hình thức
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDebt(false);
                        setColor('#059669');
                      }}
                      className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                        !isDebt
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>🎯 Tiết kiệm tích lũy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDebt(true);
                        setColor('#E11D48');
                      }}
                      className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                        isDebt
                          ? 'bg-rose-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>💳 Kế hoạch trả nợ</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    {isDebt ? 'Tên khoản nợ / Khoản vay' : 'Tên mục tiêu tiết kiệm'}
                  </label>
                  <input
                    type="text"
                    placeholder={isDebt ? 'Ví dụ: Vay ngân hàng mua xe, Nợ thẻ tín dụng, Vay anh Tuấn...' : 'Ví dụ: Quỹ dự phòng, Mua xe mới, Du lịch...'}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    {isDebt ? 'Tổng số tiền nợ gốc ban đầu (VND)' : 'Số tiền mục tiêu cần đạt (VND)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="100.000.000"
                    value={targetAmountStr ? parseInt(targetAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                    onChange={e => setTargetAmountStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    {isDebt ? 'Số nợ đã trả được tính đến hiện tại (VND)' : 'Số tiền hiện đã có sẵn (VND)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={currentAmountStr ? parseInt(currentAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                    onChange={e => setCurrentAmountStr(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Màu sắc
                  </label>
                  <div className="flex gap-2">
                    {['#E11D48', '#059669', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white font-semibold shadow-xs ${
                      isDebt ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isDebt ? 'Lưu kế hoạch trả nợ' : 'Lưu mục tiêu'}
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
