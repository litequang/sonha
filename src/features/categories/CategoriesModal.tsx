import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Archive, 
  X, 
  Check, 
  Sparkles, 
  Edit2, 
  Layers, 
  Settings, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { Category, JarType } from '../../types';
import { IconRenderer } from '../../components/common/IconRenderer';
import { SIX_JARS, getJarInfo, getJarDisplayName } from '../../utils/defaultData';
import { SixJarsConfigModal } from '../budgets/SixJarsConfigModal';

interface CategoriesModalProps {
  onClose: () => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({ onClose }) => {
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    normalizeSixJarsCategories, 
    userRole,
    household
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [selectedJarFilter, setSelectedJarFilter] = useState<JarType | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSixJarsModalOpen, setIsSixJarsModalOpen] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Form states
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#059669');
  const [catJar, setCatJar] = useState<JarType>('NEC');
  const [catIcon, setCatIcon] = useState('Tag');

  const jarKeys: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];

  const availableIcons = [
    'Utensils', 'ShoppingCart', 'Home', 'Zap', 'Droplet', 'Wifi', 
    'Fuel', 'HeartPulse', 'Baby', 'TrendingUp', 'Briefcase', 'Coins', 
    'PiggyBank', 'Building', 'Car', 'ShieldCheck', 'GraduationCap', 
    'BookOpen', 'Award', 'Plane', 'Film', 'ShoppingBag', 'Smile', 
    'Gift', 'Heart', 'HandHeart', 'Wallet', 'Tag', 'Sparkles'
  ];

  const colorPalette = [
    '#059669', '#10B981', '#047857', '#3B82F6', '#2563EB', '#1D4ED8',
    '#8B5CF6', '#7C3AED', '#6D28D9', '#F59E0B', '#D97706', '#B45309',
    '#EC4899', '#DB2777', '#BE185D', '#14B8A6', '#0D9488', '#EF4444'
  ];

  const handleStartAdd = () => {
    setEditingCategory(null);
    setCatName('');
    setCatColor(activeType === 'expense' ? (SIX_JARS[selectedJarFilter !== 'all' ? selectedJarFilter : 'NEC'].color) : '#059669');
    setCatJar(selectedJarFilter !== 'all' ? selectedJarFilter : 'NEC');
    setCatIcon('Tag');
    setIsAdding(true);
  };

  const handleStartEdit = (cat: Category) => {
    setIsAdding(false);
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color || '#059669');
    setCatJar((cat.jar as JarType) || 'NEC');
    setCatIcon(cat.icon || 'Tag');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thay đổi danh mục.');
      return;
    }

    if (!catName.trim()) {
      showError('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      if (editingCategory) {
        // Edit existing
        const updateData: any = {
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
        };
        if (activeType === 'expense') {
          updateData.jar = catJar;
        }
        await updateCategory(editingCategory.id, updateData);
        showSuccess(`Đã cập nhật danh mục "${catName}" thành công!`);
        setEditingCategory(null);
      } else {
        // Create new
        const createData: any = {
          name: catName.trim(),
          type: activeType,
          icon: catIcon,
          color: catColor,
          isArchived: false,
          isDefault: false,
        };
        if (activeType === 'expense') {
          createData.jar = catJar;
        }
        await addCategory(createData);
        showSuccess(`Đã tạo danh mục "${catName}" thành công!`);
        setIsAdding(false);
      }
      setCatName('');
    } catch (err) {
      showError('Lỗi lưu danh mục', err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleArchive = async (cat: Category) => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể sửa danh mục.');
      return;
    }

    try {
      await updateCategory(cat.id, { isArchived: !cat.isArchived });
      showSuccess(cat.isArchived ? `Đã kích hoạt lại danh mục "${cat.name}"` : `Đã ẩn danh mục "${cat.name}"`);
    } catch (err) {
      showError('Lỗi cập nhật', err instanceof Error ? err.message : String(err));
    }
  };

  const handleNormalize = async () => {
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thực hiện thao tác.');
      return;
    }
    setIsNormalizing(true);
    try {
      const added = await normalizeSixJarsCategories();
      if (added > 0) {
        showSuccess(`Đã tự động khởi tạo ${added} danh mục chi tiêu chuẩn theo Quy tắc 6 Lọ!`);
      } else {
        showSuccess('Hệ thống đã có đầy đủ các nhóm danh mục chuẩn theo 6 Chiếc Lọ.');
      }
    } catch (err) {
      showError('Không thể tạo danh mục 6 lọ', err instanceof Error ? err.message : String(err));
    } finally {
      setIsNormalizing(false);
    }
  };

  const currentCategories = categories.filter(c => c.type === activeType);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Hệ Thống Danh Mục & Quy Tắc 6 Lọ</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    JARS
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Phân loại chi tiêu theo 6 chiếc lọ chuẩn T. Harv Eker để quản lý ngân sách hiệu quả
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl font-semibold shrink-0">
              <button
                onClick={() => {
                  setActiveType('expense');
                  setIsAdding(false);
                  setEditingCategory(null);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition text-xs ${
                  activeType === 'expense'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">Chi tiêu theo 6 Lọ</span>
                <span className="sm:hidden">Chi tiêu</span>
              </button>
              <button
                onClick={() => {
                  setActiveType('income');
                  setIsAdding(false);
                  setEditingCategory(null);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition text-xs ${
                  activeType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="hidden sm:inline">Nguồn thu nhập</span>
                <span className="sm:hidden">Thu nhập</span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {activeType === 'expense' && (
                <>
                  <button
                    onClick={handleNormalize}
                    disabled={isNormalizing}
                    className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 transition"
                    title="Tự động kiểm tra và thêm các danh mục chuẩn 6 lọ nếu còn thiếu"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">{isNormalizing ? 'Đang tạo...' : 'Tạo chuẩn 6 Lọ'}</span>
                  </button>

                  <button
                    onClick={() => setIsSixJarsModalOpen(true)}
                    className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800 transition"
                    title="Cấu hình tỷ lệ % các lọ"
                  >
                    <Settings className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="hidden sm:inline">Tỷ lệ %</span>
                  </button>
                </>
              )}

              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs hover:bg-slate-800 transition"
                title="Thêm danh mục mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thêm mới</span>
              </button>
            </div>
          </div>

          {/* Form Create / Edit Category */}
          {(isAdding || editingCategory) && (
            <form onSubmit={handleSaveForm} className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 my-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>{editingCategory ? `Chỉnh sửa danh mục "${editingCategory.name}"` : 'Tạo mới danh mục'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingCategory(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tên danh mục *
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Ăn uống, Tiền nhà, Sách vở..."
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                {activeType === 'expense' && (
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Gán vào Chiếc Lọ (Quy tắc 6 Lọ) *
                    </label>
                    <select
                      value={catJar}
                      onChange={e => setCatJar(e.target.value as JarType)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                    >
                      {jarKeys.map(k => {
                        const jar = getJarInfo(k, household?.jarCustomNames);
                        const pct = household?.jarsConfig?.[k] || jar.percent;
                        return (
                          <option key={k} value={k}>
                            🏺 {jar.name} ({pct}%)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Icon & Color selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Biểu tượng ({catIcon})
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 scrollbar-none">
                    {availableIcons.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setCatIcon(ic)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                          catIcon === ic
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <IconRenderer name={ic} className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Màu sắc nhận diện
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto p-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 scrollbar-none">
                    {colorPalette.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatColor(c)}
                        className={`w-5 h-5 rounded-full shrink-0 transition ${
                          catColor === c ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingCategory(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  {editingCategory ? 'Lưu cập nhật' : 'Tạo danh mục'}
                </button>
              </div>
            </form>
          )}

          {/* 6 Jars Filter Pills (For expense view) */}
          {activeType === 'expense' && (
            <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-[11px] shrink-0 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold px-1">Lọc Lọ:</span>
              <button
                onClick={() => setSelectedJarFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition ${
                  selectedJarFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Tất cả 6 Lọ ({currentCategories.length})
              </button>

              {jarKeys.map(k => {
                const jar = getJarInfo(k, household?.jarCustomNames);
                const count = currentCategories.filter(c => c.jar === k).length;
                const isSelected = selectedJarFilter === k;
                const pct = household?.jarsConfig?.[k] || jar.percent;
                return (
                  <button
                    key={k}
                    onClick={() => setSelectedJarFilter(k)}
                    className={`px-2.5 py-1 rounded-xl font-bold shrink-0 flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? jar.color : undefined,
                    }}
                  >
                    <span>{jar.shortName}</span>
                    <span className="opacity-80">({pct}%)</span>
                    <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/10 dark:bg-white/20">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Categories List Display */}
          <div className="overflow-y-auto space-y-4 flex-1 pr-1 pt-2">
            {activeType === 'expense' ? (
              // GROUPED ACCORDING TO 6 JARS RULE
              <div className="space-y-4">
                {(selectedJarFilter === 'all' ? jarKeys : [selectedJarFilter]).map(jarKey => {
                  const jar = getJarInfo(jarKey, household?.jarCustomNames);
                  const jarCats = currentCategories.filter(c => c.jar === jarKey);
                  const pct = household?.jarsConfig?.[jarKey] || jar.percent;

                  return (
                    <div
                      key={jarKey}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 space-y-2.5"
                    >
                      {/* Jar Group Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: jar.color }}
                          >
                            <IconRenderer name={jar.icon} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {jar.name}
                              </h3>
                              <span
                                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white shrink-0"
                                style={{ backgroundColor: jar.color }}
                              >
                                {pct}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {jar.description}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                          {jarCats.length} danh mục
                        </span>
                      </div>

                      {/* Jar Categories Grid */}
                      {jarCats.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {jarCats.map(cat => (
                            <div
                              key={cat.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                                cat.isArchived
                                  ? 'opacity-40 bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-2xs hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                                  style={{ backgroundColor: cat.color }}
                                >
                                  <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                    {cat.name}
                                  </span>
                                  {cat.isArchived && (
                                    <span className="text-[9px] text-amber-500 font-bold block">
                                      Đã ẩn
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleStartEdit(cat)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                                  title="Chỉnh sửa danh mục & đổi lọ"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleArchive(cat)}
                                  className={`p-1.5 rounded-lg text-[10px] font-medium transition ${
                                    cat.isArchived
                                      ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                  title={cat.isArchived ? 'Bỏ ẩn danh mục' : 'Ẩn khỏi bảng chọn nhanh'}
                                >
                                  {cat.isArchived ? 'Hiện' : 'Ẩn'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-slate-400 text-xs">
                          <span>Chưa có danh mục nào trong lọ này. </span>
                          <button
                            onClick={() => {
                              setCatJar(jarKey);
                              handleStartAdd();
                            }}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            + Thêm ngay
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Categories without jar */}
                {(() => {
                  const unassigned = currentCategories.filter(c => !c.jar || !jarKeys.includes(c.jar as JarType));
                  if (unassigned.length === 0) return null;
                  return (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200 dark:border-amber-900">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h3 className="font-bold text-xs text-amber-900 dark:text-amber-300">
                            Danh mục chưa phân bổ vào 6 Lọ ({unassigned.length})
                          </h3>
                        </div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Bấm nút Sửa để gán lọ
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unassigned.map(cat => (
                          <div
                            key={cat.id}
                            className="p-2.5 rounded-xl border bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: cat.color }}
                              >
                                <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {cat.name}
                              </span>
                            </div>

                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold text-[10px] flex items-center gap-1 transition"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Gán vào Lọ</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // INCOME CATEGORIES
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Các nguồn thu nhập là cơ sở tính toán tổng hạn mức cho 6 Chiếc Lọ (55% Thiết yếu, 10% Tiết kiệm, v.v.).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentCategories.map(cat => (
                    <div
                      key={cat.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        cat.isArchived
                          ? 'opacity-50 bg-slate-100 dark:bg-slate-800/40 border-dashed border-slate-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 transition"
                          title="Sửa nguồn thu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(cat)}
                          className={`p-1.5 rounded-lg text-[10px] font-medium transition ${
                            cat.isArchived
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {cat.isArchived ? 'Hiện' : 'Ẩn'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Six Jars Configuration Modal */}
      {isSixJarsModalOpen && (
        <SixJarsConfigModal
          isOpen={isSixJarsModalOpen}
          onClose={() => setIsSixJarsModalOpen(false)}
        />
      )}
    </>
  );
};
