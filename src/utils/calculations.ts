import { Transaction, Category, Budget, Account, JarType, JarInfo, BudgetRolloverInfo } from '../types';
import { SIX_JARS, getJarInfo } from './defaultData';

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
  overallBudget: number;
  spentPercentage: number;
  remainingBudget: number;
  isOverBudget: boolean;
  isNearBudget: boolean; // >= 80%
}

export interface JarSpending {
  jarCode: JarType;
  jarInfo: JarInfo;
  amount: number;
  actualPercent: number; // Percentage of total monthly expenses
  targetPercent: number; // Standard target (55, 10, 10, 10, 10, 5)
  idealAmount: number; // Target amount based on monthly income
  status: 'good' | 'warning' | 'over';
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  budgetAmount?: number;
  remaining?: number;
  isOverBudget?: boolean;
}

export interface DailySpending {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "01/10", "02/10"
  expense: number;
  income: number;
}

export interface DashboardInsight {
  id: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  description: string;
  iconName: string;
}

/**
 * Calculates monthly income, expense, balance (excluding transfers)
 */
export function calculateMonthlySummary(
  transactions: Transaction[],
  budgets: Budget[]
): MonthlySummary {
  let income = 0;
  let expense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else if (tx.type === 'expense') {
      expense += tx.amount;
    }
  }

  const balance = income - expense;

  // Find overall budget or sum of category budgets
  const overallBudgetDoc = budgets.find(b => b.categoryId === 'overall');
  let overallBudget = overallBudgetDoc ? overallBudgetDoc.amount : 0;

  // If no overall budget is set, sum the category budgets
  if (overallBudget === 0) {
    overallBudget = budgets.reduce((sum, b) => sum + (b.categoryId !== 'overall' ? b.amount : 0), 0);
  }

  const remainingBudget = overallBudget > 0 ? overallBudget - expense : 0;
  const spentPercentage = overallBudget > 0 ? (expense / overallBudget) * 100 : 0;
  const isOverBudget = overallBudget > 0 && expense >= overallBudget;
  const isNearBudget = overallBudget > 0 && spentPercentage >= 80;

  return {
    income,
    expense,
    balance,
    overallBudget,
    spentPercentage,
    remainingBudget,
    isOverBudget,
    isNearBudget,
  };
}

/**
 * Calculates 6 Jars (Quy tắc 6 chiếc lọ) spending allocation
 */
export function calculateSixJarsBreakdown(
  transactions: Transaction[],
  categories: Category[],
  monthlyIncome: number = 0,
  jarsConfig?: Record<JarType, number>,
  customNames?: Record<JarType, string>
): JarSpending[] {
  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  const jarTotals: Record<JarType, number> = {
    NEC: 0,
    FFA: 0,
    LTSS: 0,
    EDU: 0,
    PLAY: 0,
    GIVE: 0,
  };

  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const cat = catMap.get(tx.categoryId);
      // Map category jar or fallback to NEC
      const jarCode: JarType = cat?.jar || 'NEC';
      if (jarTotals[jarCode] !== undefined) {
        jarTotals[jarCode] += tx.amount;
      } else {
        jarTotals['NEC'] += tx.amount;
      }
      totalExpense += tx.amount;
    }
  }

  const jarCodes: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];

  return jarCodes.map(code => {
    const info = getJarInfo(code, customNames);
    const amount = jarTotals[code];
    const actualPercent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
    const targetPercent = jarsConfig?.[code] !== undefined ? jarsConfig[code] : info.percent;
    const idealAmount = monthlyIncome > 0 ? Math.round((monthlyIncome * targetPercent) / 100) : 0;

    // Evaluate status dynamically against custom or default target percent
    let status: 'good' | 'warning' | 'over' = 'good';
    if (code === 'NEC' || code === 'PLAY') {
      if (actualPercent > targetPercent + 5) status = 'over';
      else if (actualPercent > targetPercent) status = 'warning';
    } else {
      // FFA, LTSS, EDU, GIVE
      if (actualPercent >= targetPercent) status = 'good';
      else if (actualPercent < targetPercent * 0.5) status = 'warning';
    }

    return {
      jarCode: code,
      jarInfo: info,
      amount,
      actualPercent,
      targetPercent,
      idealAmount,
      status,
    };
  });
}

/**
 * Parent Jar budget info for detailed category limits
 */
export interface ParentJarBudgetInfo {
  jarCode: JarType;
  jarInfo: JarInfo;
  parentBudget: number;
  allocatedToChildren: number;
  remainingForChildren: number;
  spentAmount: number;
  spentPercent: number;
  targetPercent: number;
}

export function calculateParentJarsBudgetInfo(
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
  overallBudgetAmount: number = 0,
  monthlyIncome: number = 0,
  jarsConfig?: Record<JarType, number>,
  customNames?: Record<JarType, string>
): Record<JarType, ParentJarBudgetInfo> {
  const jarCodes: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];
  const result = {} as Record<JarType, ParentJarBudgetInfo>;

  jarCodes.forEach(code => {
    const info = getJarInfo(code, customNames);
    const targetPercent = jarsConfig?.[code] !== undefined ? jarsConfig[code] : info.percent;

    // Direct jar budget doc: 'jar_' + code
    const directDoc = budgets.find(b => b.categoryId === `jar_${code}`);
    let parentBudget = 0;
    if (directDoc && directDoc.amount > 0) {
      parentBudget = directDoc.amount;
    } else if (overallBudgetAmount > 0) {
      parentBudget = Math.round((overallBudgetAmount * targetPercent) / 100);
    } else if (monthlyIncome > 0) {
      parentBudget = Math.round((monthlyIncome * targetPercent) / 100);
    }

    // Categories in this jar
    const catsInJar = categories.filter(c => c.type === 'expense' && !c.isArchived && (c.jar || 'NEC') === code);
    const catIdSet = new Set(catsInJar.map(c => c.id));

    // Sum of child budgets
    const allocatedToChildren = budgets
      .filter(b => catIdSet.has(b.categoryId))
      .reduce((sum, b) => sum + b.amount, 0);

    // Sum of spent in this jar
    const spentAmount = transactions
      .filter(t => t.type === 'expense' && catIdSet.has(t.categoryId))
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingForChildren = Math.max(0, parentBudget - allocatedToChildren);
    const spentPercent = parentBudget > 0 ? (spentAmount / parentBudget) * 100 : 0;

    result[code] = {
      jarCode: code,
      jarInfo: info,
      parentBudget,
      allocatedToChildren,
      remainingForChildren,
      spentAmount,
      spentPercent,
      targetPercent,
    };
  });

  return result;
}

/**
 * Calculates maximum available remaining budget for a child category from its parent jar
 */
export function calculateChildCategoryMaxAvailable(
  catId: string,
  categories: Category[],
  budgets: Budget[],
  parentJarsInfo: Record<JarType, ParentJarBudgetInfo>
): {
  parentJarCode: JarType;
  parentJarName: string;
  parentBudget: number;
  allocatedToOtherChildren: number;
  maxAvailable: number;
  currentBudget: number;
} {
  const cat = categories.find(c => c.id === catId);
  const jarCode: JarType = (cat?.jar as JarType) || 'NEC';
  const parentInfo = parentJarsInfo[jarCode];

  const currentBudgetDoc = budgets.find(b => b.categoryId === catId);
  const currentBudget = currentBudgetDoc ? currentBudgetDoc.amount : 0;

  // Other children in this jar allocated amount
  const catsInJar = categories.filter(c => c.type === 'expense' && !c.isArchived && (c.jar || 'NEC') === jarCode && c.id !== catId);
  const otherCatIds = new Set(catsInJar.map(c => c.id));
  const allocatedToOtherChildren = budgets
    .filter(b => otherCatIds.has(b.categoryId))
    .reduce((sum, b) => sum + b.amount, 0);

  const maxAvailable = Math.max(0, parentInfo.parentBudget - allocatedToOtherChildren);

  return {
    parentJarCode: jarCode,
    parentJarName: parentInfo.jarInfo.name,
    parentBudget: parentInfo.parentBudget,
    allocatedToOtherChildren,
    maxAvailable,
    currentBudget,
  };
}

/**
 * Calculates category-by-category spending breakdown and budget statuses
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[]
): CategorySpending[] {
  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  const budgetMap = new Map<string, number>();
  budgets.forEach(b => {
    if (b.categoryId !== 'overall') {
      budgetMap.set(b.categoryId, b.amount);
    }
  });

  const totals = new Map<string, number>();
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const current = totals.get(tx.categoryId) || 0;
      totals.set(tx.categoryId, current + tx.amount);
      totalExpense += tx.amount;
    }
  }

  const result: CategorySpending[] = [];

  totals.forEach((amount, catId) => {
    const cat = catMap.get(catId);
    const budgetAmount = budgetMap.get(catId);
    const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
    const isOver = budgetAmount !== undefined && amount >= budgetAmount;
    const remaining = budgetAmount !== undefined ? budgetAmount - amount : undefined;

    result.push({
      categoryId: catId,
      categoryName: cat?.name || 'Chưa phân loại',
      icon: cat?.icon || 'HelpCircle',
      color: cat?.color || '#94A3B8',
      amount,
      percentage,
      budgetAmount,
      remaining,
      isOverBudget: isOver,
    });
  });

  // Sort descending by amount
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Groups daily expense & income for line/bar charts
 */
export function calculateDailyTotals(transactions: Transaction[], monthStr: string): DailySpending[] {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const dailyMap = new Map<string, { expense: number; income: number }>();

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${monthStr}-${dStr}`;
    dailyMap.set(fullDate, { expense: 0, income: 0 });
  }

  for (const tx of transactions) {
    if (tx.type === 'transfer') continue;
    const dateKey = tx.date;
    const entry = dailyMap.get(dateKey);
    if (entry) {
      if (tx.type === 'expense') entry.expense += tx.amount;
      if (tx.type === 'income') entry.income += tx.amount;
    }
  }

  const result: DailySpending[] = [];
  dailyMap.forEach((val, date) => {
    const day = date.split('-')[2];
    result.push({
      date,
      dayLabel: `${day}/${monthNumStr}`,
      expense: val.expense,
      income: val.income,
    });
  });

  return result;
}

/**
 * Calculates account balances based on openingBalance + income - expense + transfers
 */
export function calculateAccountBalances(
  accounts: Account[],
  allTransactions: Transaction[]
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  accounts.forEach(acc => {
    balanceMap.set(acc.id, acc.openingBalance || 0);
  });

  for (const tx of allTransactions) {
    if (tx.type === 'income') {
      const cur = balanceMap.get(tx.accountId) || 0;
      balanceMap.set(tx.accountId, cur + tx.amount);
    } else if (tx.type === 'expense') {
      const cur = balanceMap.get(tx.accountId) || 0;
      balanceMap.set(tx.accountId, cur - tx.amount);
    } else if (tx.type === 'transfer' && tx.toAccountId) {
      // Out from source
      const curFrom = balanceMap.get(tx.accountId) || 0;
      balanceMap.set(tx.accountId, curFrom - tx.amount);
      // In to destination
      const curTo = balanceMap.get(tx.toAccountId) || 0;
      balanceMap.set(tx.toAccountId, curTo + tx.amount);
    }
  }

  return balanceMap;
}

/**
 * Generates smart client-side insights without AI API
 */
export function generateClientInsights(
  currentTx: Transaction[],
  prevTx: Transaction[],
  categories: Category[],
  budgets: Budget[],
  jarsConfig?: Record<JarType, number>
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  const catBreakdown = calculateCategoryBreakdown(currentTx, categories, budgets);
  const currentSummary = calculateMonthlySummary(currentTx, budgets);
  const prevSummary = calculateMonthlySummary(prevTx, budgets);

  // 1. Top category percentage insight
  if (catBreakdown.length > 0 && catBreakdown[0].amount > 0) {
    const top = catBreakdown[0];
    insights.push({
      id: 'top_cat',
      type: 'info',
      title: 'Danh mục chi tiêu lớn nhất',
      description: `${top.categoryName} đang chiếm ${top.percentage.toFixed(0)}% tổng chi tiêu tháng này (${new Intl.NumberFormat('vi-VN').format(top.amount)}đ).`,
      iconName: 'PieChart',
    });
  }

  // 2. Over budget alert
  const overBudgetCat = catBreakdown.find(c => c.isOverBudget);
  if (overBudgetCat) {
    insights.push({
      id: 'budget_over',
      type: 'alert',
      title: 'Vượt ngân sách danh mục',
      description: `Ngân sách ${overBudgetCat.categoryName} đã vượt mức hạn mức ${(overBudgetCat.budgetAmount || 0).toLocaleString('vi-VN')}đ!`,
      iconName: 'AlertTriangle',
    });
  } else {
    // Near budget warning (e.g. remaining < 20%)
    const nearBudget = catBreakdown.find(c => c.budgetAmount && c.remaining !== undefined && c.remaining > 0 && c.remaining < c.budgetAmount * 0.2);
    if (nearBudget && nearBudget.remaining !== undefined) {
      insights.push({
        id: 'budget_near',
        type: 'warning',
        title: 'Sắp chạm hạn mức',
        description: `Ngân sách ${nearBudget.categoryName} chỉ còn ${nearBudget.remaining.toLocaleString('vi-VN')}đ (còn dưới 20%).`,
        iconName: 'AlertCircle',
      });
    }
  }

  // 3. Comparison with previous month
  if (prevSummary.expense > 0 && currentSummary.expense > 0) {
    const diff = currentSummary.expense - prevSummary.expense;
    const diffPct = Math.abs(Math.round((diff / prevSummary.expense) * 100));

    if (diff > 0) {
      insights.push({
        id: 'prev_month_compare_up',
        type: 'warning',
        title: 'So với tháng trước',
        description: `Chi tiêu đang cao hơn cùng kỳ tháng trước ${diffPct}% (+${new Intl.NumberFormat('vi-VN').format(diff)}đ).`,
        iconName: 'TrendingUp',
      });
    } else if (diff < 0) {
      insights.push({
        id: 'prev_month_compare_down',
        type: 'success',
        title: 'Tiết kiệm tốt hơn tháng trước',
        description: `Gia đình đang tiết kiệm được ${diffPct}% so với tháng trước (-${new Intl.NumberFormat('vi-VN').format(Math.abs(diff))}đ).`,
        iconName: 'TrendingDown',
      });
    }
  }

  // 4. Last 7 days average daily spending
  const expenses = currentTx.filter(t => t.type === 'expense');
  if (expenses.length >= 3) {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysIso = sevenDaysAgo.toISOString().slice(0, 10);

    const recentTx = expenses.filter(t => t.date >= sevenDaysIso);
    const recentSum = recentTx.reduce((sum, t) => sum + t.amount, 0);
    const avgDaily = Math.round(recentSum / 7);

    if (avgDaily > 0) {
      insights.push({
        id: 'avg_daily',
        type: 'info',
        title: 'Chi tiêu trung bình gần đây',
        description: `7 ngày gần đây gia đình chi tiêu trung bình khoảng ${new Intl.NumberFormat('vi-VN').format(avgDaily)}đ/ngày.`,
        iconName: 'Calendar',
      });
    }
  }

  // 5. 6 Jars Rule Analysis Insight
  const jars = calculateSixJarsBreakdown(currentTx, categories, currentSummary.income, jarsConfig);
  const necJar = jars.find(j => j.jarCode === 'NEC');
  const playJar = jars.find(j => j.jarCode === 'PLAY');

  if (necJar && necJar.amount > 0) {
    if (necJar.actualPercent > necJar.targetPercent + 10) {
      insights.push({
        id: 'jars_nec_over',
        type: 'warning',
        title: 'Quy tắc 6 lọ: Lọ Thiết yếu cao',
        description: `Chi phí thiết yếu đang chiếm ${necJar.actualPercent.toFixed(0)}% chi tiêu (mục tiêu gia đình là ≤ ${necJar.targetPercent}%). Hãy tối ưu các khoản sinh hoạt cố định.`,
        iconName: 'Home',
      });
    } else if (necJar.actualPercent <= necJar.targetPercent && necJar.actualPercent > necJar.targetPercent * 0.6) {
      insights.push({
        id: 'jars_nec_good',
        type: 'success',
        title: 'Quy tắc 6 lọ: Thiết yếu cân đối',
        description: `Lọ Thiết yếu chiếm ${necJar.actualPercent.toFixed(0)}% (đạt mục tiêu ≤ ${necJar.targetPercent}% theo cấu hình 6 chiếc lọ).`,
        iconName: 'CheckCircle',
      });
    }
  }

  if (playJar && playJar.actualPercent > playJar.targetPercent + 5) {
    insights.push({
      id: 'jars_play_over',
      type: 'warning',
      title: 'Quy tắc 6 lọ: Hưởng thụ vượt mức',
      description: `Lọ Hưởng thụ đang chiếm ${playJar.actualPercent.toFixed(0)}% (mục tiêu gia đình là ${playJar.targetPercent}%). Cân nhắc điều tiết ăn ngoài và mua sắm sở thích.`,
      iconName: 'Sparkles',
    });
  }

  return insights;
}

/**
 * Calculates budget rollover (thặng dư dồn thừa hoặc thiếu hụt dồn thiếu)
 * from previous month to current month across Overall, 6 Jars, and Categories.
 */
export function calculateBudgetRolloverStats(
  currentMonth: string,
  prevMonth: string,
  allBudgets: Budget[],
  currentMonthTransactions: Transaction[],
  prevMonthTransactions: Transaction[],
  categories: Category[],
  jarsConfig?: Record<JarType, number>,
  rolloverEnabled: boolean = true
): Record<string, BudgetRolloverInfo> {
  const result: Record<string, BudgetRolloverInfo> = {};

  const currentExpenseTxs = currentMonthTransactions.filter(t => t.type === 'expense');
  const prevExpenseTxs = prevMonthTransactions.filter(t => t.type === 'expense');

  // Category mapping to jar
  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  // Current and previous overall budgets
  const curOverallDoc = allBudgets.find(b => b.month === currentMonth && b.categoryId === 'overall');
  const prevOverallDoc = allBudgets.find(b => b.month === prevMonth && b.categoryId === 'overall');

  let prevOverallAllocated = prevOverallDoc?.amount || 0;
  if (prevOverallAllocated === 0) {
    const prevJarSum = allBudgets
      .filter(b => b.month === prevMonth && b.categoryId.startsWith('jar_'))
      .reduce((sum, b) => sum + b.amount, 0);
    if (prevJarSum > 0) {
      prevOverallAllocated = prevJarSum;
    } else {
      prevOverallAllocated = allBudgets
        .filter(b => b.month === prevMonth && b.categoryId !== 'overall')
        .reduce((sum, b) => sum + b.amount, 0);
    }
  }

  let curOverallAllocated = curOverallDoc?.amount || 0;
  if (curOverallAllocated === 0) {
    const curJarSum = allBudgets
      .filter(b => b.month === currentMonth && b.categoryId.startsWith('jar_'))
      .reduce((sum, b) => sum + b.amount, 0);
    if (curJarSum > 0) {
      curOverallAllocated = curJarSum;
    } else {
      curOverallAllocated = allBudgets
        .filter(b => b.month === currentMonth && b.categoryId !== 'overall')
        .reduce((sum, b) => sum + b.amount, 0);
    }
  }

  const curTotalExpense = currentExpenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const prevTotalExpense = prevExpenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const prevOverallRollover = prevOverallAllocated > 0 ? (prevOverallAllocated - prevTotalExpense) : 0;
  const rawEffOverall = curOverallAllocated + (rolloverEnabled ? prevOverallRollover : 0);
  const effOverallBudget = Math.max(0, rawEffOverall);

  result['overall'] = {
    categoryId: 'overall',
    month: currentMonth,
    prevAllocated: prevOverallAllocated,
    prevSpent: prevTotalExpense,
    rolloverAmount: prevOverallRollover,
    currentAllocated: curOverallAllocated,
    effectiveBudget: effOverallBudget,
    currentSpent: curTotalExpense,
    remainingAmount: rawEffOverall - curTotalExpense,
    percentUsed: effOverallBudget > 0 ? (curTotalExpense / effOverallBudget) * 100 : (curTotalExpense > 0 ? 100 : 0),
  };

  // 6 Jars
  const jarCodes: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];
  jarCodes.forEach(code => {
    const jarKey = `jar_${code}`;
    const curJarDoc = allBudgets.find(b => b.month === currentMonth && b.categoryId === jarKey);
    const prevJarDoc = allBudgets.find(b => b.month === prevMonth && b.categoryId === jarKey);

    const jarPct = jarsConfig?.[code] !== undefined ? jarsConfig[code] : SIX_JARS[code].percent;

    // Previous jar budget
    let prevJarAllocated = 0;
    if (prevJarDoc && prevJarDoc.amount > 0) {
      prevJarAllocated = prevJarDoc.amount;
    } else {
      const catsInJar = categories.filter(c => (c.jar || 'NEC') === code).map(c => c.id);
      const prevCatsSum = allBudgets
        .filter(b => b.month === prevMonth && catsInJar.includes(b.categoryId))
        .reduce((sum, b) => sum + b.amount, 0);
      if (prevCatsSum > 0) {
        prevJarAllocated = prevCatsSum;
      } else if (prevOverallAllocated > 0) {
        prevJarAllocated = Math.round((prevOverallAllocated * jarPct) / 100);
      }
    }

    // Previous jar spending
    const prevJarSpent = prevExpenseTxs
      .filter(t => {
        const c = catMap.get(t.categoryId);
        return (c?.jar || 'NEC') === code;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const jarRollover = prevJarAllocated > 0 ? (prevJarAllocated - prevJarSpent) : 0;

    // Current jar budget
    let curJarAllocated = 0;
    if (curJarDoc && curJarDoc.amount > 0) {
      curJarAllocated = curJarDoc.amount;
    } else {
      const catsInJar = categories.filter(c => (c.jar || 'NEC') === code).map(c => c.id);
      const curCatsSum = allBudgets
        .filter(b => b.month === currentMonth && catsInJar.includes(b.categoryId))
        .reduce((sum, b) => sum + b.amount, 0);
      if (curCatsSum > 0) {
        curJarAllocated = curCatsSum;
      } else if (curOverallAllocated > 0) {
        curJarAllocated = Math.round((curOverallAllocated * jarPct) / 100);
      }
    }

    const rawEffJar = curJarAllocated + (rolloverEnabled ? jarRollover : 0);
    const effJarBudget = Math.max(0, rawEffJar);

    // Current jar spending
    const curJarSpent = currentExpenseTxs
      .filter(t => {
        const c = catMap.get(t.categoryId);
        return (c?.jar || 'NEC') === code;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    result[jarKey] = {
      categoryId: jarKey,
      month: currentMonth,
      prevAllocated: prevJarAllocated,
      prevSpent: prevJarSpent,
      rolloverAmount: jarRollover,
      currentAllocated: curJarAllocated,
      effectiveBudget: effJarBudget,
      currentSpent: curJarSpent,
      remainingAmount: rawEffJar - curJarSpent,
      percentUsed: effJarBudget > 0 ? (curJarSpent / effJarBudget) * 100 : (curJarSpent > 0 ? 100 : 0),
    };
  });

  // Detailed categories
  categories.filter(c => c.type === 'expense').forEach(cat => {
    const curCatDoc = allBudgets.find(b => b.month === currentMonth && b.categoryId === cat.id);
    const prevCatDoc = allBudgets.find(b => b.month === prevMonth && b.categoryId === cat.id);

    const prevCatAllocated = prevCatDoc?.amount || 0;
    const prevCatSpent = prevExpenseTxs
      .filter(t => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const catRollover = prevCatAllocated > 0 ? (prevCatAllocated - prevCatSpent) : 0;
    const curCatAllocated = curCatDoc?.amount || 0;
    const rawEffCat = curCatAllocated + (rolloverEnabled ? catRollover : 0);
    const effCatBudget = Math.max(0, rawEffCat);

    const curCatSpent = currentExpenseTxs
      .filter(t => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);

    result[cat.id] = {
      categoryId: cat.id,
      month: currentMonth,
      prevAllocated: prevCatAllocated,
      prevSpent: prevCatSpent,
      rolloverAmount: catRollover,
      currentAllocated: curCatAllocated,
      effectiveBudget: effCatBudget,
      currentSpent: curCatSpent,
      remainingAmount: rawEffCat - curCatSpent,
      percentUsed: effCatBudget > 0 ? (curCatSpent / effCatBudget) * 100 : (curCatSpent > 0 ? 100 : 0),
    };
  });

  return result;
}
