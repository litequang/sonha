import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  KeyRound, 
  Copy, 
  Check, 
  ShieldAlert, 
  UserCheck, 
  X,
  LogOut,
  Mail,
  UserPlus,
  QrCode,
  Camera,
  CameraOff,
  Share2,
  RotateCcw,
  Sparkles,
  Smartphone,
  Clipboard,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  FolderSync,
  Upload,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { useHousehold } from '../../hooks/useHousehold';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { MemberRole, Member } from '../../types';

interface HouseholdPickerModalProps {
  onClose: () => void;
  initialTab?: 'share_qr' | 'members' | 'join' | 'create' | 'households';
}

export const HouseholdPickerModal: React.FC<HouseholdPickerModalProps> = ({ 
  onClose,
  initialTab = 'share_qr'
}) => {
  const { 
    household, 
    members, 
    userRole, 
    createHousehold, 
    joinHouseholdWithInvite, 
    createInvite, 
    inviteByEmail,
    cancelEmailInvite,
    pendingEmailInvites,
    leaveHousehold,
    removeMember,
    updateMemberRole,
    userHouseholds,
    switchHousehold,
    deleteHousehold
  } = useHousehold();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'share_qr' | 'members' | 'join' | 'create' | 'households'>(initialTab);

  // QR Invite state
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [generatedInvite, setGeneratedInvite] = useState<{ id: string; link: string } | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopiedId, setHasCopiedId] = useState(false);
  const [hasCopiedToken, setHasCopiedToken] = useState(false);

  // Email Invite state
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [isSendingEmailInvite, setIsSendingEmailInvite] = useState(false);

  // Camera QR Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Pending Invite from storage
  const [pendingInviteFromStorage, setPendingInviteFromStorage] = useState<{ hhId: string; token: string } | null>(null);

  useEffect(() => {
    try {
      const pId = localStorage.getItem('sonha_pending_join_hh') || sessionStorage.getItem('sonha_pending_join_hh');
      const pTok = localStorage.getItem('sonha_pending_invite_token') || sessionStorage.getItem('sonha_pending_invite_token');
      if (pId && pTok) {
        setPendingInviteFromStorage({ hhId: pId, token: pTok });
      }
    } catch (_) {}
  }, []);

  // Delete Household state
  const [isConfirmingDeleteHousehold, setIsConfirmingDeleteHousehold] = useState(false);
  const [isDeletingHousehold, setIsDeletingHousehold] = useState(false);

  // Member management state
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      await removeMember(memberToDelete.uid);
      showSuccess(`Đã xóa thành viên "${memberToDelete.displayName || memberToDelete.email}" khỏi gia đình.`);
      setMemberToDelete(null);
    } catch (err) {
      showError('Không thể xóa thành viên', err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleToggleMemberRole = async (targetMember: Member) => {
    const nextRole: MemberRole = targetMember.role === 'member' ? 'viewer' : 'member';
    setIsUpdatingRole(targetMember.uid);
    try {
      await updateMemberRole(targetMember.uid, nextRole);
      showSuccess(`Đã đổi quyền của "${targetMember.displayName || targetMember.email}" thành ${nextRole === 'member' ? 'Thành viên (Ghi chép)' : 'Chỉ xem'}`);
    } catch (err) {
      showError('Không thể đổi quyền', err instanceof Error ? err.message : String(err));
    } finally {
      setIsUpdatingRole(null);
    }
  };

  // Create household state
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join household state
  const [smartPasteInput, setSmartPasteInput] = useState('');
  const [joinHouseholdId, setJoinHouseholdId] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Automatically generate an open QR code invite for the family
  const generateQRInvite = async (role: 'member' | 'viewer' = inviteRole) => {
    if (!household || userRole === 'viewer') return;
    setIsGeneratingQR(true);
    try {
      const token = await createInvite('', role);
      const origin = window.location.origin;
      const inviteUrl = `${origin}?join_hh=${household.id}&invite=${token}`;
      setGeneratedInvite({ id: token, link: inviteUrl });
    } catch (err) {
      showError('Không thể tạo mã QR', err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Generate QR code when opening share_qr tab
  useEffect(() => {
    if (activeTab === 'share_qr' && !generatedInvite && household) {
      generateQRInvite(inviteRole);
    }
  }, [activeTab, household]);

  // Clean up scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleRoleChange = (role: 'member' | 'viewer') => {
    setInviteRole(role);
    generateQRInvite(role);
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteEmailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      showError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setIsSendingEmailInvite(true);
    try {
      await inviteByEmail(clean, inviteRole);
      showSuccess(`Đã tạo lời mời cho "${clean}"! Khi người này đăng nhập bằng email, hệ thống sẽ tự động vào sổ gia đình ngay.`);
      setInviteEmailInput('');
    } catch (err) {
      showError('Không thể gửi lời mời', err instanceof Error ? err.message : String(err));
    } finally {
      setIsSendingEmailInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.link);
    setHasCopied(true);
    showSuccess('Đã sao chép liên kết vào bộ nhớ tạm!');
    setTimeout(() => setHasCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!generatedInvite || !household) return;
    const shareData = {
      title: `Vào sổ gia đình "${household.name}" - Sổ Nhà`,
      text: `Mời bạn quét mã QR hoặc bấm link để vào sổ tài chính "${household.name}" trên app Sổ Nhà:`,
      url: generatedInvite.link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showSuccess('Đã mở menu chia sẻ!');
      } catch (err) {
        // User cancelled or share failed
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleConfirmDeleteHousehold = async () => {
    if (!household) return;
    setIsDeletingHousehold(true);
    try {
      await deleteHousehold(household.id);
      showSuccess(`Đã xóa vĩnh viễn sổ gia đình "${household.name}".`);
      setIsConfirmingDeleteHousehold(false);
      onClose();
    } catch (err) {
      showError('Không thể xóa sổ gia đình', err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeletingHousehold(false);
    }
  };

  const handleCopyHouseholdId = () => {
    if (!household) return;
    navigator.clipboard.writeText(household.id);
    setHasCopiedId(true);
    showSuccess('Đã sao chép Mã gia đình!');
    setTimeout(() => setHasCopiedId(false), 2000);
  };

  const handleCopyToken = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.id);
    setHasCopiedToken(true);
    showSuccess('Đã sao chép Mã mời (Token)!');
    setTimeout(() => setHasCopiedToken(false), 2000);
  };

  // In-app Camera QR Scanner
  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader-viewport');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { 
            fps: 20, 
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.75);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScannedText(decodedText);
            stopScanner();
          },
          () => {}
        );
      } catch (err) {
        showError('Không thể mở Camera', 'Vui lòng cho phép quyền Camera hoặc chọn ảnh chụp QR từ máy.');
        setIsScanning(false);
      }
    }, 150);
  };

  // File-based QR Code Scanner (select screenshot from gallery)
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanningFile(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-temp-file-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleScannedText(decodedText);
      showSuccess('Quét mã QR từ ảnh thành công!');
    } catch (err) {
      showError('Không nhận diện được mã QR', 'Vui lòng chọn ảnh chụp rõ nét mã QR hoặc dán trực tiếp liên kết mời.');
    } finally {
      setIsScanningFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const parseInviteFromText = (text: string) => {
    let hhId = '';
    let token = '';

    const clean = text.trim();
    try {
      const normalized = clean.startsWith('http') ? clean : 'https://' + clean;
      const url = new URL(normalized);
      hhId = url.searchParams.get('join_hh') || '';
      token = url.searchParams.get('invite') || '';
    } catch (_) {}

    if (!hhId || !token) {
      const matchHh = clean.match(/hh_[a-zA-Z0-9_-]+/);
      if (matchHh) hhId = matchHh[0];
      const matchToken = clean.match(/invite[=:\s]+([a-zA-Z0-9_-]+)/i) || clean.match(/[a-zA-Z0-9]{16}/);
      if (matchToken) token = matchToken[1] || matchToken[0];
    }

    return { hhId, token };
  };

  const handleScannedText = async (text: string) => {
    const { hhId, token } = parseInviteFromText(text);

    if (hhId && token) {
      setJoinHouseholdId(hhId);
      setJoinToken(token);
      setIsJoining(true);
      try {
        await joinHouseholdWithInvite(hhId, token);
        showSuccess('Quét mã thành công! Đã tham gia gia đình.');
        onClose();
      } catch (err) {
        showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
      } finally {
        setIsJoining(false);
      }
    } else {
      showError('Mã QR không hợp lệ', 'Không tìm thấy thông tin gia đình trong mã QR đã quét.');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        showError('Bộ nhớ tạm trống');
        return;
      }
      setSmartPasteInput(text);
      const { hhId, token } = parseInviteFromText(text);
      if (hhId) setJoinHouseholdId(hhId);
      if (token) setJoinToken(token);
      if (hhId && token) {
        showSuccess('Đã tự động trích xuất mã gia đình và mã mời!');
      } else {
        showSuccess('Đã dán nội dung từ bộ nhớ tạm');
      }
    } catch {
      showError('Không thể đọc bộ nhớ tạm', 'Vui lòng dán trực tiếp vào ô nhập.');
    }
  };

  const handleSmartInputChange = (val: string) => {
    setSmartPasteInput(val);
    const { hhId, token } = parseInviteFromText(val);
    if (hhId) setJoinHouseholdId(hhId);
    if (token) setJoinToken(token);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinHouseholdId.trim() || !joinToken.trim()) {
      showError('Vui lòng nhập đầy đủ Mã gia đình và Mã mời.');
      return;
    }
    setIsJoining(true);
    try {
      await joinHouseholdWithInvite(joinHouseholdId.trim(), joinToken.trim());
      showSuccess('Đã tham gia gia đình thành công!');
      onClose();
    } catch (err) {
      showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) {
      showError('Vui lòng nhập tên gia đình.');
      return;
    }
    setIsCreating(true);
    try {
      await createHousehold(newHouseholdName.trim());
      showSuccess(`Đã tạo gia đình "${newHouseholdName}" thành công!`);
      setActiveTab('share_qr');
      setNewHouseholdName('');
    } catch (err) {
      showError('Không thể tạo gia đình', err instanceof Error ? err.message : String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Bạn có chắc chắn muốn rời khỏi gia đình này?')) return;
    try {
      await leaveHousehold();
      showSuccess('Đã rời khỏi gia đình.');
      onClose();
    } catch (err) {
      showError('Lỗi', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {household?.name || 'Sổ Gia Đình'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Vai trò: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{userRole === 'owner' ? 'Chủ nhà' : userRole === 'member' ? 'Thành viên' : 'Người xem'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopScanner();
              onClose();
            }} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-semibold my-3 gap-0.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              stopScanner();
              setActiveTab('share_qr');
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'share_qr'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Mã QR</span>
          </button>

          <button
            onClick={() => {
              stopScanner();
              setActiveTab('members');
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap"><span className="hidden sm:inline">Thành viên </span>({members.length})</span>
          </button>

          <button
            onClick={() => {
              stopScanner();
              setActiveTab('join');
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'join'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Quét/Vào</span>
          </button>

          {userHouseholds.length > 1 && (
            <button
              onClick={() => {
                stopScanner();
                setActiveTab('households');
              }}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'households'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FolderSync className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Đổi sổ ({userHouseholds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              stopScanner();
              setActiveTab('create');
            }}
            className={`px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Tạo sổ gia đình mới"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Tạo mới</span>
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-0.5 text-xs">
          {/* TAB 1: QR CODE SHARE */}
          {activeTab === 'share_qr' && (
            <div className="space-y-3.5 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] mb-1">
                    <Sparkles className="w-3 h-3" />
                    Quét là vào nhóm ngay
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mở Camera điện thoại hoặc Zalo quét mã dưới đây:
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="relative inline-block p-3.5 bg-white rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700">
                  {generatedInvite ? (
                    <QRCodeSVG
                      value={generatedInvite.link}
                      size={200}
                      level="M"
                      includeMargin={false}
                      className="mx-auto"
                      imageSettings={{
                        src: '/icon.svg',
                        x: undefined,
                        y: undefined,
                        height: 32,
                        width: 32,
                        excavate: true,
                      }}
                    />
                  ) : (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10 animate-pulse text-emerald-500 mb-2" />
                      <span>Đang tạo mã QR...</span>
                    </div>
                  )}
                </div>

                {/* Role Switcher */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Quyền hạn:</span>
                  <div className="inline-flex bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-xl text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('member')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        inviteRole === 'member'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      Thành viên (Ghi chép)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleChange('viewer')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        inviteRole === 'viewer'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      Chỉ xem
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={!generatedInvite || isGeneratingQR}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia sẻ qua Zalo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!generatedInvite || isGeneratingQR}
                    className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-bold text-xs shadow-2xs hover:bg-slate-50 transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopied ? 'Đã chép link' : 'Sao chép link'}</span>
                  </button>
                </div>

                {/* Household ID and Invite Token Quick Copy Cards */}
                <div className="grid grid-cols-2 gap-2 text-left pt-1">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Mã gia đình</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-white truncate block">
                        {household?.id}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHouseholdId}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 shrink-0"
                      title="Sao chép Mã gia đình"
                    >
                      {hasCopiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <div className="min-w-0 pr-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Mã mời (Token)</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-white truncate block">
                        {generatedInvite?.id || '...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      disabled={!generatedInvite}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 shrink-0"
                      title="Sao chép Mã mời"
                    >
                      {hasCopiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Thành viên có thể quét mã hoặc dán link</span>
                  <button
                    type="button"
                    onClick={() => generateQRInvite(inviteRole)}
                    disabled={isGeneratingQR}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className={`w-3 h-3 ${isGeneratingQR ? 'animate-spin' : ''}`} />
                    <span>Làm mới mã</span>
                  </button>
                </div>

                {/* Email Invite Option */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Hoặc mời trực tiếp qua Email
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Người được mời chỉ cần đăng nhập bằng đúng email này (qua Google hoặc mật khẩu) là app tự động vào sổ gia đình ngay lập tức.
                  </p>
                  <form onSubmit={handleSendEmailInvite} className="flex gap-1.5">
                    <input
                      type="email"
                      placeholder="vidu@gmail.com"
                      value={inviteEmailInput}
                      onChange={e => setInviteEmailInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSendingEmailInvite || !inviteEmailInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 shrink-0"
                    >
                      {isSendingEmailInvite ? 'Đang gửi...' : 'Mời email'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS LIST */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Danh sách thành viên ({members.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('share_qr')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mời thêm</span>
                </button>
              </div>

              <div className="space-y-2">
                {members.map(m => (
                  <div
                    key={m.uid}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                        {m.displayName ? m.displayName.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-sm">
                          {m.displayName} {m.uid === user?.uid && '(Bạn)'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Role indicator or switcher */}
                      {userRole === 'owner' && m.uid !== household?.createdBy && m.uid !== user?.uid ? (
                        <button
                          type="button"
                          onClick={() => handleToggleMemberRole(m)}
                          disabled={isUpdatingRole === m.uid}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shadow-2xs ${
                            m.role === 'member'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 hover:bg-blue-200'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                          title="Nhấn để đổi vai trò (Thành viên / Chỉ xem)"
                        >
                          <span>{m.role === 'member' ? 'Thành viên' : 'Chỉ xem'}</span>
                          <span className="text-[9px] opacity-60">⇄</span>
                        </button>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            m.uid === household?.createdBy
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : m.role === 'owner'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : m.role === 'member'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {m.uid === household?.createdBy ? '👑 Chủ nhà' : m.role === 'owner' ? 'Chủ nhà' : m.role === 'member' ? 'Thành viên' : 'Xem'}
                        </span>
                      )}

                      {/* Delete member button (Owner only, not self, not creator) */}
                      {userRole === 'owner' && m.uid !== household?.createdBy && m.uid !== user?.uid && (
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(m)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                          title="Xóa thành viên này khỏi gia đình"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending Email Invites */}
              {pendingEmailInvites.filter(inv => !inv.used).length > 0 && (
                <div className="pt-2 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Lời mời email đang chờ ({pendingEmailInvites.filter(inv => !inv.used).length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {pendingEmailInvites
                      .filter(inv => !inv.used)
                      .map(inv => (
                        <div
                          key={inv.id}
                          className="p-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {inv.email}
                            </p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Chờ đăng nhập • {inv.role === 'member' ? 'Thành viên' : 'Chỉ xem'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const origin = window.location.origin;
                                const link = `${origin}?join_hh=${inv.householdId}&invite=${inv.token}`;
                                navigator.clipboard.writeText(link);
                                showSuccess('Đã sao chép liên kết vào nhóm!');
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Sao chép link mời"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEmailInvite(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Hủy lời mời"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {household && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-mono">ID: {household.id}</span>
                    
                    <div className="flex items-center gap-2">
                      {userRole !== 'owner' ? (
                        <button
                          onClick={handleLeave}
                          className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-xs py-1 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Rời gia đình</span>
                        </button>
                      ) : (
                        <>
                          {members.filter(m => m.role === 'owner').length > 1 && (
                            <button
                              onClick={handleLeave}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-semibold text-xs py-1 px-2 rounded-lg hover:bg-slate-100"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Rời gia đình</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDeleteHousehold(true)}
                            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold text-xs py-1.5 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95"
                            title="Xóa vĩnh viễn sổ gia đình này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa sổ gia đình</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JOIN HOUSEHOLD (SCAN CAMERA, PHOTO, OR PASTE) */}
          {activeTab === 'join' && (
            <div className="space-y-3.5">
              {/* Hidden file input for photo upload */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileScan} 
              />
              <div id="qr-temp-file-reader" style={{ display: 'none' }} />

              {/* Pending Invite detected from storage */}
              {pendingInviteFromStorage && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2">
                  <div className="min-w-0 pr-1 text-left">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      Phát hiện lời mời đang chờ
                    </span>
                    <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {pendingInviteFromStorage.hhId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setJoinHouseholdId(pendingInviteFromStorage.hhId);
                      setJoinToken(pendingInviteFromStorage.token);
                      setIsJoining(true);
                      try {
                        await joinHouseholdWithInvite(pendingInviteFromStorage.hhId, pendingInviteFromStorage.token);
                        showSuccess('Đã tham gia gia đình thành công!');
                        setPendingInviteFromStorage(null);
                        try {
                          localStorage.removeItem('sonha_pending_join_hh');
                          localStorage.removeItem('sonha_pending_invite_token');
                        } catch (_) {}
                        onClose();
                      } catch (err) {
                        showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
                      } finally {
                        setIsJoining(false);
                      }
                    }}
                    disabled={isJoining}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs"
                  >
                    {isJoining ? 'Đang vào...' : 'Vào ngay'}
                  </button>
                </div>
              )}

              {/* Camera Scanner View */}
              {isScanning ? (
                <div className="p-3 bg-slate-900 text-white rounded-2xl text-center space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                      <Camera className="w-4 h-4 animate-pulse" />
                      Đang quét camera...
                    </span>
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
                    >
                      Đóng camera
                    </button>
                  </div>

                  <div 
                    id="qr-reader-viewport" 
                    className="w-full max-w-[260px] mx-auto overflow-hidden rounded-xl bg-black border-2 border-emerald-500 shadow-md" 
                  />

                  <p className="text-[11px] text-slate-300">
                    Hướng camera về phía mã QR trên màn hình hoặc giấy để tự động nhận diện.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startScanner}
                    className="py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Bật Camera quét mã</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningFile}
                    className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs shadow-2xs border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isScanningFile ? 'Đang đọc ảnh...' : 'Chọn ảnh chụp QR'}</span>
                  </button>
                </div>
              )}

              {/* Smart Paste / Manual Code Input */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Dán nhanh link hoặc mã mời
                  </span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Dán từ clipboard</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Dán link https://...?join_hh=... hoặc nội dung mã"
                  value={smartPasteInput}
                  onChange={e => handleSmartInputChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />

                <form onSubmit={handleJoin} className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Mã gia đình</label>
                      <input
                        type="text"
                        placeholder="hh_..."
                        value={joinHouseholdId}
                        onChange={e => setJoinHouseholdId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Mã mời (Token)</label>
                      <input
                        type="text"
                        placeholder="16 ký tự"
                        value={joinToken}
                        onChange={e => setJoinToken(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isJoining || !joinHouseholdId || !joinToken}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition active:scale-95"
                  >
                    {isJoining ? 'Đang tham gia...' : 'Tham gia gia đình'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: SWITCH HOUSEHOLDS */}
          {activeTab === 'households' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Sổ gia đình của bạn ({userHouseholds.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo sổ mới</span>
                </button>
              </div>

              <div className="space-y-2">
                {userHouseholds.map(hh => (
                  <div
                    key={hh.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                      hh.id === household?.id
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/80 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="min-w-0 pr-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                          {hh.name}
                        </p>
                        {hh.id === household?.id && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Đang mở
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        ID: {hh.id} • <span className="text-slate-600 dark:text-slate-300 font-sans">{hh.role === 'owner' ? '👑 Chủ nhà' : hh.role === 'member' ? 'Thành viên' : 'Chỉ xem'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hh.id !== household?.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            await switchHousehold(hh.id);
                            showSuccess(`Đã chuyển sang sổ "${hh.name}"`);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition active:scale-95"
                        >
                          Mở sổ này
                        </button>
                      )}
                      {hh.role === 'owner' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (hh.id !== household?.id) {
                              switchHousehold(hh.id);
                            }
                            setIsConfirmingDeleteHousehold(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Xóa sổ gia đình này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CREATE NEW HOUSEHOLD */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateHousehold} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Tên sổ gia đình mới
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gia đình Bình An, Tổ ấm nhỏ..."
                  value={newHouseholdName}
                  onChange={e => setNewHouseholdName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Tạo sổ gia đình mới để độc lập quản lý chi tiêu. Bạn có thể chia sẻ mã QR cho các thành viên khác quét mã cùng tham gia.
              </p>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                {isCreating ? 'Đang tạo...' : 'Tạo gia đình mới'}
              </button>
            </form>
          )}
        </div>

        {/* Delete Member Confirmation Modal */}
        {memberToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Xác nhận xóa thành viên</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bạn có chắc muốn xóa <strong className="text-slate-800 dark:text-slate-200">{memberToDelete.displayName || memberToDelete.email}</strong> khỏi sổ gia đình này? Họ sẽ không còn quyền truy cập hay ghi chép nữa.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  disabled={isDeletingMember}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMember}
                  disabled={isDeletingMember}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {isDeletingMember ? 'Đang xóa...' : 'Xóa thành viên'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Household Confirmation Modal */}
        {isConfirmingDeleteHousehold && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Xóa vĩnh viễn sổ gia đình</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bạn có chắc muốn xóa vĩnh viễn sổ <strong className="text-slate-800 dark:text-slate-200">"{household?.name}"</strong> không?
                </p>
                <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300 text-left space-y-1">
                  <p className="font-semibold flex items-center gap-1 text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Lưu ý đặc biệt:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                    <li>Toàn bộ thu chi, tài khoản, ngân sách sẽ bị xóa sạch.</li>
                    <li>Tất cả thành viên sẽ mất quyền truy cập.</li>
                    <li>Hành động này không thể hoàn tác.</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeleteHousehold(false)}
                  disabled={isDeletingHousehold}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteHousehold}
                  disabled={isDeletingHousehold}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {isDeletingHousehold ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
