import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  Users, 
  Plus,
  QrCode,
  RotateCcw,
  LogOut,
  Search,
  CheckCircle2,
  Loader2,
  Camera,
  Image as ImageIcon,
  Clipboard
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../hooks/useAuth';
import { useHousehold } from '../../hooks/useHousehold';
import { useToast } from '../../components/common/Toast';
import { setDeviceTrustPreference } from '../../lib/firebase/config';

export const AuthView: React.FC = () => {
  const { 
    user, 
    signInWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    logout,
    loading: authLoading, 
    error: authError, 
    clearError 
  } = useAuth();
  const { 
    household, 
    createHousehold, 
    joinHouseholdWithInvite, 
    isCheckingInvites, 
    checkAndJoinPendingInvites 
  } = useHousehold();
  const { showSuccess, showError } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPersonalDevice, setIsPersonalDevice] = useState(true);

  // Post-login household onboarding state
  const [onboardingMode, setOnboardingMode] = useState<'picker' | 'create' | 'join'>('picker');
  const [householdName, setHouseholdName] = useState('');
  const [joinHouseholdId, setJoinHouseholdId] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [smartJoinInput, setSmartJoinInput] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<{ hhId: string; token: string } | null>(null);

  // Scanner state for AuthView onboarding
  const [isAuthScanning, setIsAuthScanning] = useState(false);
  const [isAuthScanningFile, setIsAuthScanningFile] = useState(false);
  const authFileInputRef = useRef<HTMLInputElement | null>(null);
  const authScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    try {
      const pId = localStorage.getItem('sonha_pending_join_hh') || sessionStorage.getItem('sonha_pending_join_hh');
      const pTok = localStorage.getItem('sonha_pending_invite_token') || sessionStorage.getItem('sonha_pending_invite_token');
      if (pId && pTok) {
        setPendingInvite({ hhId: pId, token: pTok });
      }
    } catch (_) {}
  }, []);

  const parseAuthInviteText = (text: string) => {
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

  const handleAuthScannedText = async (text: string) => {
    const { hhId, token } = parseAuthInviteText(text);
    if (hhId && token) {
      setJoinHouseholdId(hhId);
      setJoinToken(token);
      setIsOnboarding(true);
      try {
        await joinHouseholdWithInvite(hhId, token);
        showSuccess('Quét mã thành công! Đã tham gia gia đình.');
        try {
          localStorage.removeItem('sonha_pending_join_hh');
          localStorage.removeItem('sonha_pending_invite_token');
        } catch (_) {}
      } catch (err) {
        showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
      } finally {
        setIsOnboarding(false);
      }
    } else {
      showError('Mã QR không hợp lệ', 'Không tìm thấy thông tin gia đình trong mã đã quét.');
    }
  };

  const startAuthScanner = async () => {
    setIsAuthScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('auth-qr-reader-viewport');
        authScannerRef.current = scanner;
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
            handleAuthScannedText(decodedText);
            stopAuthScanner();
          },
          () => {}
        );
      } catch (err) {
        showError('Không thể mở Camera', 'Vui lòng cho phép quyền Camera hoặc chọn ảnh chụp QR từ máy.');
        setIsAuthScanning(false);
      }
    }, 150);
  };

  const stopAuthScanner = async () => {
    if (authScannerRef.current) {
      try {
        if (authScannerRef.current.isScanning) {
          await authScannerRef.current.stop();
        }
        authScannerRef.current.clear();
      } catch (_) {}
      authScannerRef.current = null;
    }
    setIsAuthScanning(false);
  };

  const handleAuthFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAuthScanningFile(true);
    try {
      const html5QrCode = new Html5Qrcode('auth-qr-temp-file-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleAuthScannedText(decodedText);
    } catch (err) {
      showError('Không nhận diện được mã QR', 'Vui lòng chọn ảnh chụp rõ nét mã QR hoặc dán trực tiếp liên kết mời.');
    } finally {
      setIsAuthScanningFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Manual re-check state
  const [isRechecking, setIsRechecking] = useState(false);
  const [customCheckEmail, setCustomCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState<{ message: string; success: boolean } | null>(null);

  // If user is logged in but invites are still being checked
  if (user && !household && isCheckingInvites) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Đang tìm dữ liệu sổ gia đình...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs text-center">
          Đang kiểm tra lời mời gia đình cho tài khoản <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email || 'của bạn'}</span>
        </p>
      </div>
    );
  }

  // If user is logged in but doesn't have a household yet
  if (user && !household) {
    const handleManualCheck = async (targetEmail?: string) => {
      setIsRechecking(true);
      setCheckResult(null);
      try {
        const res = await checkAndJoinPendingInvites(targetEmail);
        if (res.found) {
          showSuccess(res.message);
        } else {
          setCheckResult({ message: res.message, success: false });
        }
      } catch (err) {
        showError('Không thể kiểm tra lời mời', err instanceof Error ? err.message : String(err));
      } finally {
        setIsRechecking(false);
      }
    };

    const handleCreateNew = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!householdName.trim()) {
        showError('Vui lòng nhập tên gia đình.');
        return;
      }
      setIsOnboarding(true);
      try {
        await createHousehold(householdName.trim());
        showSuccess(`Chào mừng bạn đến với "${householdName}"!`);
      } catch (err) {
        showError('Không thể tạo gia đình', err instanceof Error ? err.message : String(err));
      } finally {
        setIsOnboarding(false);
      }
    };

    const handleJoinExisting = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!joinHouseholdId.trim() || !joinToken.trim()) {
        showError('Vui lòng nhập mã gia đình và mã mời.');
        return;
      }
      setIsOnboarding(true);
      try {
        await joinHouseholdWithInvite(joinHouseholdId.trim(), joinToken.trim());
        showSuccess('Đã tham gia gia đình thành công!');
      } catch (err) {
        showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
      } finally {
        setIsOnboarding(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Home className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Chào mừng bạn đến với Sổ Nhà!
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Bắt đầu kiểm soát chi tiêu gia đình bằng cách kết nối sổ có sẵn hoặc tạo mới.
          </p>

          {/* Quick email invite detection card */}
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                  Tài khoản đang đăng nhập
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.email || 'Chưa có email'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleManualCheck()}
                disabled={isRechecking}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                <span>{isRechecking ? 'Đang tìm...' : 'Tìm lời mời'}</span>
              </button>
            </div>

            {checkResult && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200/60 dark:border-amber-900/60">
                {checkResult.message}
              </p>
            )}

            {/* Custom check for alternative email */}
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <details className="text-left group">
                <summary className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  <span>Được mời bằng địa chỉ email khác?</span>
                </summary>
                <div className="mt-2 flex gap-1.5">
                  <input
                    type="email"
                    placeholder="Nhập email đã được mời..."
                    value={customCheckEmail}
                    onChange={e => setCustomCheckEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleManualCheck(customCheckEmail)}
                    disabled={isRechecking || !customCheckEmail.trim()}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>
                </div>
              </details>
            </div>
          </div>

          {onboardingMode === 'picker' && (
            <div className="space-y-3">
              {pendingInvite && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/80 text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        Có lời mời tham gia sổ gia đình!
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">Mã: {pendingInvite.hhId}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsOnboarding(true);
                      try {
                        await joinHouseholdWithInvite(pendingInvite.hhId, pendingInvite.token);
                        showSuccess('Đã tham gia gia đình thành công!');
                        try {
                          localStorage.removeItem('sonha_pending_join_hh');
                          localStorage.removeItem('sonha_pending_invite_token');
                          sessionStorage.removeItem('sonha_pending_join_hh');
                          sessionStorage.removeItem('sonha_pending_invite_token');
                        } catch (_) {}
                      } catch (err) {
                        showError('Không thể tham gia', err instanceof Error ? err.message : String(err));
                      } finally {
                        setIsOnboarding(false);
                      }
                    }}
                    disabled={isOnboarding}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>{isOnboarding ? 'Đang kết nối...' : 'Tham gia sổ này ngay'}</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setOnboardingMode('create')}
                className="w-full p-4 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 transition flex items-center gap-3 text-left group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tạo gia đình mới</h3>
                  <p className="text-xs text-slate-500">Khởi tạo sổ mới với danh mục và tài khoản mẫu</p>
                </div>
              </button>

              <button
                onClick={() => setOnboardingMode('join')}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 transition flex items-center gap-3 text-left group"
              >
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 group-hover:scale-105 transition">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Quét mã QR / Tham gia sổ</h3>
                  <p className="text-xs text-slate-500">Quét camera, chọn ảnh chụp hoặc nhập mã mời</p>
                </div>
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Đăng nhập tài khoản khác?</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}

          {onboardingMode === 'create' && (
            <form onSubmit={handleCreateNew} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên gia đình / Sổ chi tiêu
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gia đình Bình An, Nhà của Nam..."
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  autoFocus
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardingMode('picker')}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  {isOnboarding ? 'Đang tạo...' : 'Tạo gia đình ngay'}
                </button>
              </div>
            </form>
          )}

          {onboardingMode === 'join' && (
            <div className="space-y-3.5 text-left">
              <input 
                type="file" 
                ref={authFileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleAuthFileScan} 
              />
              <div id="auth-qr-temp-file-reader" style={{ display: 'none' }} />

              {/* Camera Scanner View */}
              {isAuthScanning ? (
                <div className="p-3 bg-slate-900 text-white rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                      <Camera className="w-4 h-4 animate-pulse" />
                      Đang quét camera...
                    </span>
                    <button
                      type="button"
                      onClick={stopAuthScanner}
                      className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800"
                    >
                      Đóng
                    </button>
                  </div>

                  <div 
                    id="auth-qr-reader-viewport" 
                    className="w-full max-w-[240px] mx-auto overflow-hidden rounded-xl bg-black border-2 border-emerald-500 shadow-md" 
                  />
                  <p className="text-[11px] text-slate-300">
                    Hướng camera về phía mã QR để tham gia tự động.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startAuthScanner}
                    className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Quét mã bằng Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => authFileInputRef.current?.click()}
                    disabled={isAuthScanningFile}
                    className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs shadow-2xs border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAuthScanningFile ? 'Đang đọc...' : 'Chọn ảnh chụp QR'}</span>
                  </button>
                </div>
              )}

              {/* Smart Paste Box */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dán liên kết mời
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) {
                          setSmartJoinInput(txt);
                          const { hhId, token } = parseAuthInviteText(txt);
                          if (hhId) setJoinHouseholdId(hhId);
                          if (token) setJoinToken(token);
                          showSuccess('Đã trích xuất thông tin mời từ bộ nhớ tạm!');
                        }
                      } catch {
                        showError('Vui lòng dán trực tiếp vào ô bên dưới');
                      }
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Dán nhanh</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Dán link https://...?join_hh=... hoặc mã"
                  value={smartJoinInput}
                  onChange={e => {
                    setSmartJoinInput(e.target.value);
                    const { hhId, token } = parseAuthInviteText(e.target.value);
                    if (hhId) setJoinHouseholdId(hhId);
                    if (token) setJoinToken(token);
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <form onSubmit={handleJoinExisting} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      Mã ID gia đình
                    </label>
                    <input
                      type="text"
                      placeholder="hh_..."
                      value={joinHouseholdId}
                      onChange={e => setJoinHouseholdId(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      Mã mời (Token)
                    </label>
                    <input
                      type="text"
                      placeholder="Mã token"
                      value={joinToken}
                      onChange={e => setJoinToken(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopAuthScanner();
                      setOnboardingMode('picker');
                    }}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isOnboarding || !joinHouseholdId.trim() || !joinToken.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95"
                  >
                    {isOnboarding ? 'Đang xác thực...' : 'Tham gia sổ gia đình'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Screen
  const handleGoogleSignIn = async () => {
    setDeviceTrustPreference(isPersonalDevice ? 'personal' : 'shared');
    try {
      await signInWithGoogle();
      showSuccess('Đăng nhập thành công!');
    } catch {
      // handled in hook
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setDeviceTrustPreference(isPersonalDevice ? 'personal' : 'shared');
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        showSuccess('Đăng nhập thành công!');
      } else {
        await registerWithEmail(email, password, name || 'Thành viên');
        showSuccess('Đăng ký tài khoản thành công!');
      }
    } catch {
      // handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
            <Home className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Sổ Nhà
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý tài chính & thu chi gia đình Việt
          </p>
        </div>

        {/* Error message */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {authError}
          </div>
        )}

        {/* Pending QR Invite Banner */}
        {typeof window !== 'undefined' && Boolean(sessionStorage.getItem('sonha_pending_join_hh')) && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
            <QrCode className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold">Bạn vừa quét mã tham gia gia đình!</p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400">
                Hãy đăng nhập để hệ thống tự động kết nối vào sổ gia đình.
              </p>
            </div>
          </div>
        )}

        {/* Google Sign-in */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200 shadow-xs flex items-center justify-center gap-2.5 transition active:scale-98"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Đăng nhập với Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold">
              Hoặc dùng Email
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Device Trust Preference Checkbox (Offline first requirement) */}
          <div className="pt-1">
            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isPersonalDevice}
                onChange={e => setIsPersonalDevice(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Đây là thiết bị cá nhân (bật lưu trữ offline)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition active:scale-98"
          >
            {isSubmitting
              ? 'Đang xử lý...'
              : mode === 'login'
              ? 'Đăng nhập'
              : 'Đăng ký tài khoản'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              clearError();
            }}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            {mode === 'login'
              ? 'Chưa có tài khoản? Đăng ký ngay'
              : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};
