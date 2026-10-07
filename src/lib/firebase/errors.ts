import { auth } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Transforms technical errors into user-friendly Vietnamese messages
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  let msg = error instanceof Error ? error.message : String(error);

  // If the message contains serialized FirestoreErrorInfo, extract original error
  try {
    const parsed = JSON.parse(msg);
    if (parsed && typeof parsed.error === 'string') {
      msg = parsed.error;
    }
  } catch (_) {}

  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Bạn không có quyền thực hiện thao tác này (hoặc phiên đăng nhập đã hết hạn).';
  }
  if (msg.includes('unavailable') || msg.includes('offline') || msg.includes('network')) {
    return 'Không có kết nối mạng. Dữ liệu đã được lưu tạm trên máy và sẽ tự động đồng bộ khi có Internet.';
  }
  if (msg.includes('not-found')) {
    return 'Không tìm thấy dữ liệu yêu cầu.';
  }
  if (msg.includes('already-exists')) {
    return 'Dữ liệu này đã tồn tại trong hệ thống.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'Email này đã được đăng ký tài khoản trước đó.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự.';
  }
  if (msg.includes('auth/unauthorized-domain')) {
    return 'Tên miền này chưa được cấp quyền trong Firebase Authentication (Authorized Domains). Vui lòng thêm tên miền vào Firebase Console > Authentication > Settings > Authorized domains.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.';
  }
  if (msg.includes('auth/cancelled-popup-request')) {
    return 'Yêu cầu đăng nhập đã bị huỷ.';
  }

  return msg;
}

/**
 * Diagnostic logger complying with Firebase skill specification
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
