import { Category, Account, JarType, JarInfo } from '../types';

export const SIX_JARS: Record<JarType, JarInfo> = {
  NEC: {
    code: 'NEC',
    name: 'Thiết yếu (Necessities)',
    shortName: 'Thiết yếu',
    percent: 55,
    color: '#059669', // Emerald
    icon: 'Home',
    description: 'Chi phí sinh hoạt hằng ngày không thể thiếu (ăn uống, đi chợ, nhà ở, điện nước, xăng xe, y tế)',
  },
  FFA: {
    code: 'FFA',
    name: 'Tự do tài chính (Financial Freedom)',
    shortName: 'Tự do tài chính',
    percent: 10,
    color: '#3B82F6', // Blue
    icon: 'TrendingUp',
    description: 'Khoản đầu tư sinh lời, cổ phiếu, bất động sản, vốn kinh doanh tạo thu nhập thụ động',
  },
  LTSS: {
    code: 'LTSS',
    name: 'Tiết kiệm dài hạn (Long-term Savings)',
    shortName: 'Tiết kiệm dài hạn',
    percent: 10,
    color: '#8B5CF6', // Purple
    icon: 'PiggyBank',
    description: 'Tích lũy mua nhà, mua xe, quỹ dự phòng khẩn cấp, bảo hiểm gia đình',
  },
  EDU: {
    code: 'EDU',
    name: 'Giáo dục & Phát triển (Education)',
    shortName: 'Giáo dục',
    percent: 10,
    color: '#F59E0B', // Amber
    icon: 'GraduationCap',
    description: 'Học phí con cái, sách vở, khóa học phát triển kỹ năng, đào tạo bản thân',
  },
  PLAY: {
    code: 'PLAY',
    name: 'Hưởng thụ & Giải trí (Play)',
    shortName: 'Hưởng thụ',
    percent: 10,
    color: '#EC4899', // Pink
    icon: 'Sparkles',
    description: 'Tận hưởng cuộc sống, du lịch, xem phim, ăn nhà hàng sang trọng, mua sắm sở thích',
  },
  GIVE: {
    code: 'GIVE',
    name: 'Cho đi & Thiện nguyện (Give)',
    shortName: 'Cho đi',
    percent: 5,
    color: '#14B8A6', // Teal
    icon: 'HeartHandshake',
    description: 'Hiếu hỉ, quà biếu cha mẹ, từ thiện, giúp đỡ người thân và bạn bè lúc hoạn nạn',
  },
};

/**
 * Returns JarInfo with custom name if specified by household
 */
export function getJarInfo(code: JarType, customNames?: Record<JarType, string>): JarInfo {
  const base = SIX_JARS[code] || SIX_JARS.NEC;
  const custom = customNames?.[code]?.trim();
  if (custom) {
    return {
      ...base,
      name: custom,
      shortName: custom,
    };
  }
  return base;
}

/**
 * Returns formatted short display name for a jar code
 */
export function getJarDisplayName(code: JarType, customNames?: Record<JarType, string>): string {
  return customNames?.[code]?.trim() || SIX_JARS[code]?.shortName || code;
}

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  // LỌ 1: THIẾT YẾU (NEC - 55%)
  { name: 'Ăn uống & Cà phê', type: 'expense', icon: 'Utensils', color: '#059669', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Đi chợ & Siêu thị', type: 'expense', icon: 'ShoppingCart', color: '#10B981', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Tiền thuê nhà / Nhà cửa', type: 'expense', icon: 'Home', color: '#047857', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Điện sinh hoạt', type: 'expense', icon: 'Zap', color: '#065F46', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Nước sạch', type: 'expense', icon: 'Droplet', color: '#0D9488', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Internet & Điện thoại', type: 'expense', icon: 'Wifi', color: '#0F766E', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Xăng xe & Đi lại', type: 'expense', icon: 'Fuel', color: '#115E59', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Thuốc men & Y tế', type: 'expense', icon: 'HeartPulse', color: '#134E4A', jar: 'NEC', isArchived: false, isDefault: true },
  { name: 'Nhu yếu phẩm con cái', type: 'expense', icon: 'Baby', color: '#10B981', jar: 'NEC', isArchived: false, isDefault: true },

  // LỌ 2: TỰ DO TÀI CHÍNH (FFA - 10%)
  { name: 'Đầu tư chứng khoán / Quỹ', type: 'expense', icon: 'TrendingUp', color: '#3B82F6', jar: 'FFA', isArchived: false, isDefault: true },
  { name: 'Vốn kinh doanh sinh lời', type: 'expense', icon: 'Briefcase', color: '#2563EB', jar: 'FFA', isArchived: false, isDefault: true },
  { name: 'Đầu tư vàng & tài sản', type: 'expense', icon: 'Coins', color: '#1D4ED8', jar: 'FFA', isArchived: false, isDefault: true },

  // LỌ 3: TIẾT KIỆM DÀI HẠN (LTSS - 10%)
  { name: 'Quỹ dự phòng khẩn cấp', type: 'expense', icon: 'PiggyBank', color: '#8B5CF6', jar: 'LTSS', isArchived: false, isDefault: true },
  { name: 'Tích lũy mua nhà / đất', type: 'expense', icon: 'Building', color: '#7C3AED', jar: 'LTSS', isArchived: false, isDefault: true },
  { name: 'Tích lũy mua xe / sửa nhà', type: 'expense', icon: 'Car', color: '#6D28D9', jar: 'LTSS', isArchived: false, isDefault: true },
  { name: 'Bảo hiểm nhân thọ & sức khỏe', type: 'expense', icon: 'ShieldCheck', color: '#5B21B6', jar: 'LTSS', isArchived: false, isDefault: true },

  // LỌ 4: GIÁO DỤC (EDU - 10%)
  { name: 'Học phí trường học & Lớp thêm', type: 'expense', icon: 'GraduationCap', color: '#F59E0B', jar: 'EDU', isArchived: false, isDefault: true },
  { name: 'Sách vở & Đồ dùng học tập', type: 'expense', icon: 'BookOpen', color: '#D97706', jar: 'EDU', isArchived: false, isDefault: true },
  { name: 'Khóa học phát triển bản thân', type: 'expense', icon: 'Award', color: '#B45309', jar: 'EDU', isArchived: false, isDefault: true },

  // LỌ 5: HƯỞNG THỤ (PLAY - 10%)
  { name: 'Du lịch & Nghỉ dưỡng', type: 'expense', icon: 'Plane', color: '#EC4899', jar: 'PLAY', isArchived: false, isDefault: true },
  { name: 'Giải trí, Xem phim, Tiệc tùng', type: 'expense', icon: 'Film', color: '#DB2777', jar: 'PLAY', isArchived: false, isDefault: true },
  { name: 'Mua sắm trang phục & Sở thích', type: 'expense', icon: 'ShoppingBag', color: '#BE185D', jar: 'PLAY', isArchived: false, isDefault: true },
  { name: 'Chăm sóc bản thân & Spa', type: 'expense', icon: 'Smile', color: '#9D174D', jar: 'PLAY', isArchived: false, isDefault: true },

  // LỌ 6: CHO ĐI (GIVE - 5%)
  { name: 'Hiếu hỉ (Cưới hỏi, ma chay)', type: 'expense', icon: 'Gift', color: '#14B8A6', jar: 'GIVE', isArchived: false, isDefault: true },
  { name: 'Quà biếu & Phụng dưỡng bố mẹ', type: 'expense', icon: 'Heart', color: '#0D9488', jar: 'GIVE', isArchived: false, isDefault: true },
  { name: 'Từ thiện & Giúp đỡ bạn bè', type: 'expense', icon: 'HandHeart', color: '#0F766E', jar: 'GIVE', isArchived: false, isDefault: true },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Lương cố định', type: 'income', icon: 'Briefcase', color: '#10B981', isArchived: false, isDefault: true },
  { name: 'Thưởng & KPI', type: 'income', icon: 'Award', color: '#F59E0B', isArchived: false, isDefault: true },
  { name: 'Kinh doanh & Bán lẻ', type: 'income', icon: 'TrendingUp', color: '#3B82F6', isArchived: false, isDefault: true },
  { name: 'Thu nhập thụ động & Đầu tư', type: 'income', icon: 'PieChart', color: '#8B5CF6', isArchived: false, isDefault: true },
  { name: 'Được tặng / Tiền mừng', type: 'income', icon: 'Smile', color: '#EC4899', isArchived: false, isDefault: true },
  { name: 'Thu nhập khác', type: 'income', icon: 'Coins', color: '#64748B', isArchived: false, isDefault: true },
];

export const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'createdAt'>[] = [
  { name: 'Tiền mặt', type: 'cash', openingBalance: 2000000, isActive: true, icon: 'Banknote', color: '#10B981' },
  { name: 'Tài khoản ngân hàng', type: 'bank', openingBalance: 15000000, isActive: true, icon: 'Landmark', color: '#3B82F6' },
  { name: 'Ví điện tử', type: 'ewallet', openingBalance: 1000000, isActive: true, icon: 'Smartphone', color: '#8B5CF6' },
];
