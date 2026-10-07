import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit2, 
  Trash2,
  AlertTriangle,
  X, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  HandCoins, 
  CreditCard, 
  Landmark, 
  Banknote, 
  Smartphone, 
  Receipt, 
  Coins,
  DollarSign,
  Building,
  TrendingUp,
  GripVertical,
  Check
} from 'lucide-react';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { Account, AccountType, AssetMetadata } from '../../types';
import { formatVND } from '../../utils/formatters';
import { IconRenderer } from '../../components/common/IconRenderer';
import { calculateAccountBalances } from '../../utils/calculations';

export const AccountsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount, reorderAccounts, userRole } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<Account | null>(null);
  const [accToDelete, setAccToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDebtGuide, setShowDebtGuide] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');
  const [isNegativeInitial, setIsNegativeInitial] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState('#3B82F6');

  // Asset specific states (Requirement 4: Vàng, Ngoại tệ, Tài sản khác)
  const [assetType, setAssetType] = useState<'gold' | 'currency' | 'stock' | 'real_estate' | 'crypto' | 'other'>('gold');
  const [assetUnit, setAssetUnit] = useState('lượng');
  const [assetQuantityStr, setAssetQuantityStr] = useState('1');
  const [assetUnitPriceStr, setAssetUnitPriceStr] = useState('85000000');

  const balances = calculateAccountBalances(accounts, transactions);

  // Financial summary
  let totalPositive = 0;
  let totalDebt = 0;
  accounts.forEach(acc => {
    const bal = balances.get(acc.id) || 0;
    if (bal >= 0) {
      totalPositive += bal;
    } else {
      totalDebt += Math.abs(bal);
    }
  });
  const netWorth = totalPositive - totalDebt;

  // Asset auto calculation
  const parsedAssetQty = parseFloat(assetQuantityStr.replace(',', '.')) || 0;
  const parsedAssetUnitPrice = parseInt(assetUnitPriceStr.replace(/\D/g, ''), 10) || 0;
  const calculatedAssetValue = Math.round(parsedAssetQty * parsedAssetUnitPrice);

  const handleOpenAdd = (preferredType?: AccountType) => {
    setSelectedAcc(null);
    const chosenType = preferredType || 'bank';
    setName('');
    setType(chosenType);
    setOpeningBalanceStr('0');
    setIsActive(true);

    if (chosenType === 'debt') {
      setIsNegativeInitial(true);
      setColor('#E11D48');
    } else if (chosenType === 'card') {
      setIsNegativeInitial(false);
      setColor('#8B5CF6');
    } else if (chosenType === 'asset') {
      setIsNegativeInitial(false);
      setAssetType('gold');
      setAssetUnit('lượng');
      setAssetQuantityStr('1');
      setAssetUnitPriceStr('85000000');
      setColor('#D97706');
    } else {
      setIsNegativeInitial(false);
      setColor('#3B82F6');
    }
    setIsEditing(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setSelectedAcc(acc);
    setName(acc.name);
    setType(acc.type);
    setIsActive(acc.isActive !== false);
    setIsNegativeInitial(acc.openingBalance < 0 || acc.type === 'debt');
    setOpeningBalanceStr(String(Math.abs(acc.openingBalance)));
    setColor(acc.color || (acc.type === 'debt' ? '#E11D48' : acc.type === 'card' ? '#8B5CF6' : acc.type === 'asset' ? '#D97706' : '#3B82F6'));

    if (acc.type === 'asset' && acc.assetMetadata) {
      setAssetType(acc.assetMetadata.assetType || 'gold');
      setAssetUnit(acc.assetMetadata.unit || 'lượng');
      setAssetQuantityStr(String(acc.assetMetadata.quantity || 1));
      setAssetUnitPriceStr(String(acc.assetMetadata.unitPrice || 0));
    } else {
      setAssetType('gold');
      setAssetUnit('lượng');
      setAssetQuantityStr('1');
      setAssetUnitPriceStr('85000000');
    }

    setIsEditing(true);
  };

  const handleAssetTypeChange = (newAssetType: 'gold' | 'currency' | 'stock' | 'real_estate' | 'crypto' | 'other') => {
    setAssetType(newAssetType);
    if (newAssetType === 'gold') {
      setAssetUnit('lượng');
      setAssetUnitPriceStr('85000000');
      setColor('#D97706');
      if (!name || name === 'USD tích trữ' || name === 'Cổ phiếu') setName('Vàng miếng SJC');
    } else if (newAssetType === 'currency') {
      setAssetUnit('USD');
      setAssetUnitPriceStr('25500');
      setColor('#10B981');
      if (!name || name === 'Vàng miếng SJC') setName('USD tích trữ');
    } else if (newAssetType === 'stock') {
      setAssetUnit('cổ phiếu');
      setAssetUnitPriceStr('50000');
      setColor('#3B82F6');
      if (!name || name === 'Vàng miếng SJC') setName('Cổ phiếu đầu tư');
    } else if (newAssetType === 'real_estate') {
      setAssetUnit('BĐS');
      setAssetUnitPriceStr('2000000000');
      setColor('#8B5CF6');
      if (!name || name === 'Vàng miếng SJC') setName('Bất động sản tích lũy');
    } else {
      setAssetUnit('phần');
      setAssetUnitPriceStr('10000000');
      setColor('#64748B');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể thay đổi tài khoản.');
      return;
    }

    if (!name.trim()) {
      showError('Vui lòng nhập tên tài khoản.');
      return;
    }

    let bal = 0;
    let assetMeta: AssetMetadata | undefined = undefined;

    if (type === 'asset') {
      bal = calculatedAssetValue;
      assetMeta = {
        assetType,
        unit: assetUnit.trim() || 'đơn vị',
        quantity: parsedAssetQty,
        unitPrice: parsedAssetUnitPrice,
        updatedAt: new Date().toISOString()
      };
    } else {
      const num = parseInt(openingBalanceStr.replace(/\D/g, ''), 10) || 0;
      const isNeg = type === 'debt' ? true : isNegativeInitial;
      bal = (isNeg ? -1 : 1) * num;
    }

    const icon = type === 'cash' 
      ? 'Banknote' 
      : type === 'bank' 
      ? 'Landmark' 
      : type === 'ewallet' 
      ? 'Smartphone' 
      : type === 'card' 
      ? 'CreditCard' 
      : type === 'debt' 
      ? 'HandCoins' 
      : type === 'asset'
      ? (assetType === 'gold' ? 'Coins' : assetType === 'currency' ? 'DollarSign' : assetType === 'real_estate' ? 'Building' : 'TrendingUp')
      : 'Receipt';

    try {
      if (selectedAcc) {
        await updateAccount(selectedAcc.id, {
          name: name.trim(),
          type,
          openingBalance: bal,
          isActive,
          icon,
          color,
          assetMetadata: assetMeta,
        });
        showSuccess('Đã cập nhật tài khoản.');
      } else {
        await addAccount({
          name: name.trim(),
          type,
          openingBalance: bal,
          isActive: true,
          icon,
          color,
          assetMetadata: assetMeta,
        });
        showSuccess('Đã thêm tài khoản mới.');
      }
      setIsEditing(false);
    } catch (err) {
      showError('Lỗi cập nhật', err instanceof Error ? err.message : String(err));
    }
  };

  // Drag and drop & reorder accounts (Requirement 3)
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const newArr = [...accounts];
    const [movedItem] = newArr.splice(draggedIdx, 1);
    newArr.splice(targetIdx, 0, movedItem);
    setDraggedIdx(null);
    await reorderAccounts(newArr);
    showSuccess('Đã cập nhật thứ tự tài khoản!');
  };

  const handleMoveAccount = async (fromIdx: number, direction: -1 | 1) => {
    const targetIdx = fromIdx + direction;
    if (targetIdx < 0 || targetIdx >= accounts.length) return;
    const newArr = [...accounts];
    const [movedItem] = newArr.splice(fromIdx, 1);
    newArr.splice(targetIdx, 0, movedItem);
    await reorderAccounts(newArr);
    showSuccess('Đã chuyển thứ tự tài khoản!');
  };

  const handleConfirmDelete = async () => {
    if (!accToDelete) return;
    if (userRole === 'viewer') {
      showError('Bạn có quyền Người xem, không thể xóa tài khoản.');
      return;
    }
    try {
      setIsDeleting(true);
      await deleteAccount(accToDelete.id);
      showSuccess(`Đã xóa ví "${accToDelete.name}" thành công.`);
      if (selectedAcc?.id === accToDelete.id) {
        setIsEditing(false);
        setSelectedAcc(null);
      }
      setAccToDelete(null);
    } catch (err) {
      showError('Lỗi khi xóa tài khoản', err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Nguồn Tiền, Khoản Nợ & Tài Sản
              </h2>
              <p className="text-xs text-slate-400">Tiền mặt, ngân hàng, vàng, ngoại tệ & thẻ tín dụng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1">
          {/* Summary Box: Total Cash, Total Debt, Net Worth */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Tiền & Tài sản có</span>
              <span className="block text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatVND(totalPositive)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Nợ / Dư nợ thẻ</span>
              <span className="block text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 truncate">
                {totalDebt > 0 ? `-${formatVND(totalDebt)}` : '0đ'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-medium">Tài sản ròng</span>
              <span className={`block text-xs sm:text-sm font-black truncate ${
                netWorth >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatVND(netWorth)}
              </span>
            </div>
          </div>

          {/* Practical Debt & Asset Guide Toggle */}
          <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDebtGuide(!showDebtGuide)}
              className="w-full p-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition text-left"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Hướng dẫn: Quản lý nợ, thẻ tín dụng & tài sản (Vàng, USD...)</span>
              </div>
              {showDebtGuide ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            </button>
            {showDebtGuide && (
              <div className="p-3 pt-0 border-t border-amber-200/50 dark:border-amber-900/40 text-slate-700 dark:text-slate-300 space-y-2 text-[11.5px] leading-relaxed">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  <strong className="text-amber-900 dark:text-amber-300 block mb-1">
                    🪙 Tài sản tích lũy (Vàng, Ngoại tệ, Bất động sản):
                  </strong>
                  <p>
                    Bấm <strong>+ Thêm tài sản</strong>, nhập số lượng (ví dụ 3 lượng vàng) và đơn giá (85 triệu/lượng). App sẽ tự động nhân ra số tiền tương đối và cộng vào Tài sản ròng của gia đình.
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  <strong className="text-rose-700 dark:text-rose-300 block mb-1">
                    🔴 Khoản nợ & Cách trả nợ hằng tháng:
                  </strong>
                  <p>
                    Bấm <strong>+ Thêm khoản nợ</strong>, nhập số nợ. Hằng tháng khi trả nợ, dùng tính năng <strong>Chuyển tiền</strong> (Từ Ngân hàng sang Khoản nợ), số nợ sẽ giảm dần về 0đ.
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  <strong className="text-blue-700 dark:text-blue-300 block mb-1">
                    🖐️ Thay đổi thứ tự hiển thị:
                  </strong>
                  <p>
                    Dùng biểu tượng kéo thả <strong>⠿</strong> hoặc mũi tên <strong>▲ ▼</strong> bên cạnh từng ví để sắp xếp thứ tự hiển thị ưu tiên theo thói quen của bạn.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Danh sách tài khoản ({accounts.length})
            </span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => handleOpenAdd('asset')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 hover:bg-amber-100 font-semibold text-xs transition"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Thêm tài sản (Vàng...)</span>
              </button>
              <button
                onClick={() => handleOpenAdd('debt')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold text-xs transition"
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span>+ Thêm nợ</span>
              </button>
              <button
                onClick={() => handleOpenAdd('bank')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm ví</span>
              </button>
            </div>
          </div>

          {/* Tips Banner */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Kéo thả để đổi thứ tự ví</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              Bấm biểu tượng thùng rác để xóa ví khi tạo nhầm
            </span>
          </div>

          {/* Accounts List with Drag & Drop Reordering */}
          <div className="grid grid-cols-1 gap-2.5">
            {accounts.map((acc, idx) => {
              const currentBalance = balances.get(acc.id) || 0;
              const isNegative = currentBalance < 0;
              const isDebtAccount = acc.type === 'debt';
              const isCardAccount = acc.type === 'card';
              const isAssetAccount = acc.type === 'asset';
              const isDraggingThis = draggedIdx === idx;

              return (
                <div
                  key={acc.id}
                  draggable={true}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition select-none ${
                    isDraggingThis
                      ? 'opacity-40 border-dashed border-blue-400 bg-blue-50/50'
                      : isNegative || isDebtAccount
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                      : isAssetAccount
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Drag Handle & Mobile Up/Down buttons (Requirement 3) */}
                    <div className="flex items-center text-slate-400 hover:text-slate-600 shrink-0">
                      <div 
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded"
                        title="Kéo thả để đổi thứ tự"
                      >
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col -space-y-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveAccount(idx, -1)}
                          className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                          title="Di chuyển lên trên"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === accounts.length - 1}
                          onClick={() => handleMoveAccount(idx, 1)}
                          className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                          title="Di chuyển xuống dưới"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ 
                        backgroundColor: (isNegative || isDebtAccount) && (isCardAccount || isDebtAccount) 
                          ? '#E11D48' 
                          : isAssetAccount
                          ? '#D97706'
                          : acc.color 
                      }}
                    >
                      <IconRenderer 
                        name={acc.icon || (isDebtAccount ? 'HandCoins' : isCardAccount ? 'CreditCard' : isAssetAccount ? 'Coins' : 'Landmark')} 
                        className="w-5 h-5" 
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </h4>
                        {isDebtAccount && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                            Khoản nợ
                          </span>
                        )}
                        {isCardAccount && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                            Thẻ tín dụng
                          </span>
                        )}
                        {isAssetAccount && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                            🪙 {acc.assetMetadata?.assetType === 'gold' ? 'Vàng' : acc.assetMetadata?.assetType === 'currency' ? 'Ngoại tệ' : 'Tài sản'}
                          </span>
                        )}
                        {acc.isActive === false && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                            Tạm ẩn
                          </span>
                        )}
                      </div>

                      {/* Details row: Shows asset calculation or current balance */}
                      {isAssetAccount && acc.assetMetadata ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{acc.assetMetadata.quantity} {acc.assetMetadata.unit}</span>
                          <span className="opacity-75"> × {formatVND(acc.assetMetadata.unitPrice)}</span>
                          <span className="mx-1">➔</span>
                          <strong className="text-amber-700 dark:text-amber-400 font-bold">
                            {formatVND(currentBalance)}
                          </strong>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isDebtAccount
                            ? 'Dư nợ hiện tại: '
                            : isCardAccount
                            ? (isNegative ? 'Dư nợ thẻ: ' : 'Số dư thẻ: ')
                            : (isNegative ? 'Số dư âm: ' : 'Số dư hiện tại: ')}
                          <strong className={isNegative || isDebtAccount ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                            {formatVND(currentBalance)}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition"
                      title="Sửa tài khoản / Cập nhật giá"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAccToDelete(acc)}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title="Xóa ví / tài khoản (khi tạo nhầm)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedAcc 
                    ? 'Sửa thông tin tài khoản' 
                    : type === 'asset'
                    ? 'Thêm Tài sản tích lũy (Vàng, USD...)'
                    : type === 'debt' 
                    ? 'Thêm Khoản nợ / Khoản vay mới' 
                    : 'Tạo tài khoản mới'}
                </h4>
                <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} noValidate className="mt-3 space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Tên tài khoản / Tài sản
                  </label>
                  <input
                    type="text"
                    placeholder={
                      type === 'asset'
                        ? 'Ví dụ: Vàng miếng SJC, USD tích trữ, Cổ phiếu VNM...'
                        : type === 'debt' 
                        ? 'Ví dụ: Nợ vay mua xe, Vay ngân hàng VCB, Nợ anh Nam...' 
                        : type === 'card' 
                        ? 'Ví dụ: Thẻ Visa Techcombank, Thẻ HSBC...' 
                        : 'Ví dụ: Vietcombank, Tiền mặt, Momo...'
                    }
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Loại tài khoản
                  </label>
                  <select
                    value={type}
                    onChange={e => {
                      const newType = e.target.value as AccountType;
                      setType(newType);
                      if (newType === 'debt') {
                        setIsNegativeInitial(true);
                        setColor('#E11D48');
                      } else if (newType === 'card') {
                        setColor('#8B5CF6');
                      } else if (newType === 'asset') {
                        setIsNegativeInitial(false);
                        setColor('#D97706');
                        if (!name) setName('Vàng miếng SJC');
                      } else {
                        setIsNegativeInitial(false);
                        setColor('#3B82F6');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs"
                  >
                    <option value="bank">🏦 Tài khoản Ngân hàng</option>
                    <option value="cash">💵 Tiền mặt</option>
                    <option value="ewallet">📱 Ví điện tử (Momo, ZaloPay...)</option>
                    <option value="card">💳 Thẻ tín dụng (Credit Card)</option>
                    <option value="asset">🪙 Tài sản tích lũy (Vàng, Ngoại tệ, Bất động sản...)</option>
                    <option value="debt">🔴 Khoản vay / Nợ phải trả (Vay ngân hàng, mua trả góp...)</option>
                    <option value="other">📦 Khác</option>
                  </select>
                </div>

                {/* REQUIREMENT 4: DEDICATED ASSET CALCULATOR (Vàng, USD, Ngoại tệ...) */}
                {type === 'asset' && (
                  <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span>Quy đổi giá trị tài sản ra tiền tương đối:</span>
                      </span>
                    </div>

                    {/* Sub-type selector: Vàng, Ngoại tệ, Cổ phiếu... */}
                    <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => handleAssetTypeChange('gold')}
                        className={`py-1.5 rounded-lg border text-center transition ${
                          assetType === 'gold' 
                            ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        🪙 Vàng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetTypeChange('currency')}
                        className={`py-1.5 rounded-lg border text-center transition ${
                          assetType === 'currency' 
                            ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        💵 Ngoại tệ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetTypeChange('stock')}
                        className={`py-1.5 rounded-lg border text-center transition ${
                          assetType === 'stock' 
                            ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        📈 Cổ phiếu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetTypeChange('real_estate')}
                        className={`py-1.5 rounded-lg border text-center transition ${
                          assetType === 'real_estate' 
                            ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        🏠 Nhà đất
                      </button>
                    </div>

                    {/* Inputs: Số lượng & Đơn vị tính */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Số lượng sở hữu
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Ví dụ: 3 hoặc 2.5"
                          value={assetQuantityStr}
                          onChange={e => setAssetQuantityStr(e.target.value.replace(/[^0-9.,]/g, ''))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                          Đơn vị tính
                        </label>
                        <input
                          type="text"
                          placeholder="lượng, chỉ, USD..."
                          value={assetUnit}
                          onChange={e => setAssetUnit(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Unit price input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-600 dark:text-slate-300">
                          Đơn giá ước tính (VND / {assetUnit || 'đơn vị'})
                        </label>
                        {/* Quick preset prices */}
                        <div className="flex gap-1 flex-wrap">
                          {assetType === 'gold' && (
                            <>
                              <button
                                type="button"
                                onClick={() => { setAssetUnit('lượng'); setAssetUnitPriceStr('85000000'); }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-200"
                              >
                                85tr/lượng
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAssetUnit('chỉ'); setAssetUnitPriceStr('8500000'); }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-200"
                              >
                                8.5tr/chỉ
                              </button>
                            </>
                          )}
                          {assetType === 'currency' && (
                            <>
                              <button
                                type="button"
                                onClick={() => { setAssetUnit('USD'); setAssetUnitPriceStr('25500'); }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              >
                                25.5k/USD
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={assetUnitPriceStr ? parseInt(assetUnitPriceStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                        onChange={e => setAssetUnitPriceStr(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Auto Calculation Result Banner */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold">
                          Số tiền quy đổi tương đối:
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {parsedAssetQty} {assetUnit} × {formatVND(parsedAssetUnitPrice)}/{assetUnit}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                        {formatVND(calculatedAssetValue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Specific help for Debt type */}
                {type === 'debt' && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                    <p className="font-bold">🔴 Đây là Khoản nợ phải trả:</p>
                    <p>
                      Số tiền bạn nhập bên dưới sẽ được lưu tự động là <strong>số âm</strong> (ví dụ: -20.000.000đ) để theo dõi dư nợ và tự trừ vào Tài sản ròng.
                    </p>
                    <p className="text-[10.5px] opacity-90 pt-0.5">
                      💡 Khi bạn trả nợ hằng tháng, dùng tính năng <strong>Chuyển tiền</strong> từ Ngân hàng sang Khoản nợ này để giảm nợ.
                    </p>
                  </div>
                )}

                {/* Status Toggle if Cash/Bank/Ewallet/Card */}
                {type !== 'debt' && type !== 'asset' && (
                  <div>
                    <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                      Trạng thái số tiền ban đầu
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setIsNegativeInitial(false)}
                        className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                          !isNegativeInitial
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>🟢</span>
                        <span>{type === 'card' ? 'Thẻ chưa nợ (0đ / Có sẵn)' : 'Số tiền có sẵn (+)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNegativeInitial(true)}
                        className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                          isNegativeInitial
                            ? 'bg-rose-600 text-white shadow-xs font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>🔴</span>
                        <span>{type === 'card' ? 'Đang nợ thẻ (-)' : 'Đang nợ / Bị âm (-)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard Balance Input (for non-asset) */}
                {type !== 'asset' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-600 dark:text-slate-300">
                        {type === 'debt' 
                          ? 'Số tiền nợ ban đầu (VND)' 
                          : isNegativeInitial 
                          ? 'Số dư nợ ban đầu (VND)' 
                          : 'Số dư có ban đầu (VND)'}
                      </label>
                      {/* Quick amount buttons */}
                      <div className="flex gap-1">
                        {[0, 5000000, 20000000, 50000000].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setOpeningBalanceStr(String(v))}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          >
                            {v === 0 ? '0đ' : `${v / 1000000}tr`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      {(type === 'debt' || isNegativeInitial) && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-rose-600 dark:text-rose-400 text-xl">
                          -
                        </span>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={openingBalanceStr ? parseInt(openingBalanceStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN') : ''}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw.includes('-')) {
                            setIsNegativeInitial(true);
                          }
                          if (raw.includes('+')) {
                            setIsNegativeInitial(false);
                          }
                          setOpeningBalanceStr(raw.replace(/\D/g, ''));
                        }}
                        className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-base ${
                          type === 'debt' || isNegativeInitial 
                            ? 'pl-8 text-rose-600 dark:text-rose-400' 
                            : 'text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>

                    {/* Live preview */}
                    <div className="mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Số dư ghi nhận trong sổ:</span>
                      <span className={`font-black ${
                        (type === 'debt' || isNegativeInitial) && (parseInt(openingBalanceStr.replace(/\D/g, ''), 10) || 0) > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {(type === 'debt' || isNegativeInitial) && (parseInt(openingBalanceStr.replace(/\D/g, ''), 10) || 0) > 0
                          ? `-${formatVND(parseInt(openingBalanceStr.replace(/\D/g, ''), 10) || 0)} (Dư nợ)`
                          : `${formatVND(parseInt(openingBalanceStr.replace(/\D/g, ''), 10) || 0)} (Số dư có)`}
                      </span>
                    </div>

                    {type === 'card' && !isNegativeInitial && (
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        💡 <em>Gợi ý thẻ tín dụng:</em> Nếu thẻ chưa nợ hoặc mới mở, để <strong>0đ</strong> (không nhập hạn mức tín dụng). Khi quẹt thẻ chi tiêu, app sẽ tự trừ thành số âm (dư nợ thẻ).
                      </p>
                    )}
                  </div>
                )}

                {/* Active / Archive Toggle */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Đang hoạt động
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Tắt mục này để tạm ẩn khỏi danh sách thêm giao dịch mà không mất lịch sử cũ
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                  {selectedAcc ? (
                    <button
                      type="button"
                      onClick={() => setAccToDelete(selectedAcc)}
                      className="px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1.5 font-semibold transition text-xs"
                      title="Xóa ví này (khi tạo nhầm)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ví</span>
                    </button>
                  ) : <div />}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {accToDelete && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa ví / tài khoản
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Bạn có chắc chắn muốn xóa ví <strong className="text-slate-900 dark:text-white">"{accToDelete.name}"</strong>?
                  </p>
                </div>
              </div>

              {(() => {
                const txCount = transactions.filter(t => t.accountId === accToDelete.id || t.toAccountId === accToDelete.id).length;
                if (txCount > 0) {
                  return (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-1">
                      <p>
                        ⚠️ <strong>Lưu ý:</strong> Ví này đang có <strong>{txCount} giao dịch</strong> liên quan trong lịch sử.
                      </p>
                      <p className="text-[11px] opacity-90">
                        Nếu bạn chỉ muốn ẩn ví khỏi danh sách thêm mới mà vẫn giữ số liệu, hãy bấm <strong>Sửa ví ➔ Tắt "Đang hoạt động"</strong>.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs">
                      ✅ Ví này chưa phát sinh giao dịch nào. Xóa ví sẽ dọn dẹp danh sách an toàn và nhanh gọn.
                    </div>
                  );
                }
              })()}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAccToDelete(null)}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
