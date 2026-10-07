import { writeBatch, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { getCurrentMonthStr } from './formatters';
import { generateSecureToken } from './formatters';

export async function seedDemoTransactions(householdId: string, currentUserId: string): Promise<number> {
  const batch = writeBatch(db);
  const now = new Date();
  const currentMonth = getCurrentMonthStr();
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const demoItems = [
    { title: 'Lương tháng', type: 'income', amount: 28000000, cat: 'cat_inc_1', acc: 'acc_2', day: 5, note: 'Lương công ty' },
    { title: 'Thưởng KPI quý', type: 'income', amount: 6500000, cat: 'cat_inc_2', acc: 'acc_2', day: 10, note: 'Thưởng hoàn thành vượt chỉ tiêu' },
    { title: 'Tiền chợ đầu tháng', type: 'expense', amount: 480000, cat: 'cat_exp_2', acc: 'acc_1', day: 1, note: 'Thịt bò, cá, rau củ quả' },
    { title: 'Tiền điện sinh hoạt', type: 'expense', amount: 1450000, cat: 'cat_exp_4', acc: 'acc_2', day: 3, note: 'Hoá đơn điện EVN' },
    { title: 'Tiền nước', type: 'expense', amount: 165000, cat: 'cat_exp_5', acc: 'acc_3', day: 4, note: 'Hoá đơn nước sạch' },
    { title: 'Cước Internet FPT', type: 'expense', amount: 260000, cat: 'cat_exp_6', acc: 'acc_2', day: 5, note: 'Gói cáp quang gia đình' },
    { title: 'Cà phê & ăn sáng gia đình', type: 'expense', amount: 180000, cat: 'cat_exp_1', acc: 'acc_3', day: 6, note: 'Phở bò và cà phê sáng' },
    { title: 'Đổ xăng ô tô / xe máy', type: 'expense', amount: 650000, cat: 'cat_exp_8', acc: 'acc_2', day: 7, note: 'Đổ đầy bình' },
    { title: 'Siêu thị Co.opmart', type: 'expense', amount: 1250000, cat: 'cat_exp_2', acc: 'acc_2', day: 8, note: 'Gia vị, dầu ăn, sữa bột' },
    { title: 'Học phí bé Bo', type: 'expense', amount: 4200000, cat: 'cat_exp_11', acc: 'acc_2', day: 10, note: 'Tiền học tháng này' },
    { title: 'Mua sách & dụng cụ học tập', type: 'expense', amount: 320000, cat: 'cat_exp_11', acc: 'acc_3', day: 11, note: 'Vở viết và bút' },
    { title: 'Thuốc cảm & vitamin C', type: 'expense', amount: 210000, cat: 'cat_exp_12', acc: 'acc_1', day: 12, note: 'Hiệu thuốc Long Châu' },
    { title: 'Ăn tối cuối tuần', type: 'expense', amount: 890000, cat: 'cat_exp_1', acc: 'acc_2', day: 14, note: 'Nhà hàng lẩu nướng gia đình' },
    { title: 'Xem phim rạp CGV', type: 'expense', amount: 380000, cat: 'cat_exp_14', acc: 'acc_3', day: 15, note: 'Vé xem phim cuối tuần' },
    { title: 'Quần áo mới cho con', type: 'expense', amount: 750000, cat: 'cat_exp_13', acc: 'acc_2', day: 16, note: 'Đồ thu đông' },
    { title: 'Đi chợ rau tươi', type: 'expense', amount: 195000, cat: 'cat_exp_2', acc: 'acc_1', day: 17, note: 'Rau cải, hoa quả sạch' },
    { title: 'Nạp tiền điện thoại Viettel', type: 'expense', amount: 200000, cat: 'cat_exp_7', acc: 'acc_3', day: 18, note: 'Gói cước 4G thoại' },
    { title: 'Mừng đám cưới bạn thân', type: 'expense', amount: 1000000, cat: 'cat_exp_15', acc: 'acc_2', day: 20, note: 'Phong bì cưới Tuấn' },
    { title: 'Bảo dưỡng xe máy định kỳ', type: 'expense', amount: 450000, cat: 'cat_exp_8', acc: 'acc_1', day: 22, note: 'Thay dầu nhớt & má phanh' },
    { title: 'Ăn uống gia đình', type: 'expense', amount: 310000, cat: 'cat_exp_1', acc: 'acc_3', day: 24, note: 'Cơm tấm sườn bì chả' },
    { title: 'Lợi nhuận kinh doanh online', type: 'income', amount: 4200000, cat: 'cat_inc_3', acc: 'acc_2', day: 25, note: 'Bán hàng handmade' },
  ];

  let count = 0;
  for (const item of demoItems) {
    const dayClamped = Math.min(item.day, now.getDate() > 0 ? 28 : 28);
    const dayStr = String(dayClamped).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
    const txId = 'tx_demo_' + generateSecureToken(8);
    const nowIso = new Date().toISOString();

    const tx = {
      id: txId,
      type: item.type,
      amount: item.amount,
      categoryId: item.cat,
      accountId: item.acc,
      date: dateStr,
      note: item.note,
      createdBy: currentUserId,
      createdByName: 'Gia đình mẫu',
      createdAt: nowIso,
      updatedAt: nowIso,
      clientCreatedAt: nowIso,
      clientUpdatedAt: nowIso,
    };

    batch.set(doc(db, 'households', householdId, 'transactions', txId), tx);
    count++;
  }

  // Also seed a couple of budgets
  const budget1 = {
    id: `bgt_${currentMonth}_overall`,
    month: currentMonth,
    categoryId: 'overall',
    amount: 25000000,
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'budgets', budget1.id), budget1);

  const budget2 = {
    id: `bgt_${currentMonth}_cat_exp_1`,
    month: currentMonth,
    categoryId: 'cat_exp_1',
    amount: 5000000,
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'budgets', budget2.id), budget2);

  const budget3 = {
    id: `bgt_${currentMonth}_cat_exp_2`,
    month: currentMonth,
    categoryId: 'cat_exp_2',
    amount: 6000000,
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'budgets', budget3.id), budget3);

  // Seed sample saving goals
  const goal1 = {
    id: 'goal_sample_1',
    name: 'Quỹ khẩn cấp 6 tháng',
    targetAmount: 100000000,
    currentAmount: 45000000,
    targetDate: `${year + 1}-12-31`,
    color: '#059669',
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'goals', goal1.id), goal1);

  const goal2 = {
    id: 'goal_sample_2',
    name: 'Du lịch Đà Nẵng hè',
    targetAmount: 20000000,
    currentAmount: 12500000,
    targetDate: `${year}-07-15`,
    color: '#0284C7',
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'goals', goal2.id), goal2);

  // Seed a recurring rule
  const rec1 = {
    id: 'rec_sample_1',
    title: 'Tiền điện & nước tháng',
    amount: 1600000,
    type: 'expense',
    categoryId: 'cat_exp_4',
    accountId: 'acc_2',
    frequency: 'monthly',
    nextDueDate: `${year}-${String(month).padStart(2, '0')}-05`,
    active: true,
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'households', householdId, 'recurringRules', rec1.id), rec1);

  await batch.commit();
  return count;
}

/**
 * Removes all demo transactions, sample goals, sample recurring rules, and sample budgets
 */
export async function clearDemoData(householdId: string): Promise<{
  deletedTx: number;
  deletedGoals: number;
  deletedRules: number;
}> {
  let deletedTx = 0;
  let deletedGoals = 0;
  let deletedRules = 0;

  type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;
  const operations: BatchOperation[] = [];

  // 1. Demo transactions
  try {
    const txSnap = await getDocs(collection(db, 'households', householdId, 'transactions'));
    txSnap.forEach(d => {
      const data = d.data();
      if (d.id.startsWith('tx_demo_') || data.createdByName === 'Gia đình mẫu') {
        deletedTx++;
        operations.push(batch => batch.delete(d.ref));
      }
    });
  } catch (err) {
    console.warn('Error fetching demo transactions for delete:', err);
  }

  // 2. Demo saving goals
  try {
    const goalsSnap = await getDocs(collection(db, 'households', householdId, 'goals'));
    goalsSnap.forEach(d => {
      if (d.id.startsWith('goal_sample_')) {
        deletedGoals++;
        operations.push(batch => batch.delete(d.ref));
      }
    });
  } catch (err) {
    console.warn('Error fetching demo goals for delete:', err);
  }

  // 3. Demo recurring rules
  try {
    const recSnap = await getDocs(collection(db, 'households', householdId, 'recurringRules'));
    recSnap.forEach(d => {
      if (d.id.startsWith('rec_sample_')) {
        deletedRules++;
        operations.push(batch => batch.delete(d.ref));
      }
    });
  } catch (err) {
    console.warn('Error fetching demo recurring rules for delete:', err);
  }

  // 4. Sample budgets
  const currentMonth = getCurrentMonthStr();
  const sampleBudgetIds = [
    `bgt_${currentMonth}_overall`,
    `bgt_${currentMonth}_cat_exp_1`,
    `bgt_${currentMonth}_cat_exp_2`,
  ];
  sampleBudgetIds.forEach(bId => {
    operations.push(batch => batch.delete(doc(db, 'households', householdId, 'budgets', bId)));
  });

  // Execute in batches of 400
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(op => op(batch));
    await batch.commit();
  }

  return { deletedTx, deletedGoals, deletedRules };
}
