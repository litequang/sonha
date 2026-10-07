import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db, stripUndefined } from '../lib/firebase/config';
import { useAuth } from './useAuth';
import { updateSnapshotMetadata } from './useSyncStatus';
import { 
  Household, 
  Member, 
  MemberRole, 
  Transaction, 
  Category, 
  Account, 
  Budget, 
  SavingGoal, 
  RecurringRule,
  HouseholdInvite,
  EmailInvite,
  JarType,
  BudgetRolloverInfo,
  HouseholdBackupData
} from '../types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_ACCOUNTS, SIX_JARS } from '../utils/defaultData';
import { getCurrentMonthStr, getPreviousMonthStr, generateSecureToken } from '../utils/formatters';
import { handleFirestoreError, OperationType, getFriendlyErrorMessage } from '../lib/firebase/errors';
import { calculateBudgetRolloverStats } from '../utils/calculations';

interface HouseholdContextType {
  household: Household | null;
  members: Member[];
  userRole: MemberRole;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  // Collections
  transactions: Transaction[];
  prevMonthTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  allBudgets: Budget[];
  budgetRollovers: Record<string, BudgetRolloverInfo>;
  goals: SavingGoal[];
  recurringRules: RecurringRule[];
  loading: boolean;
  isCheckingInvites: boolean;
  error: string | null;
  pendingEmailInvites: EmailInvite[];
  userHouseholds: { id: string; name: string; role: MemberRole }[];
  // Actions
  createHousehold: (name: string) => Promise<string>;
  joinHouseholdWithInvite: (householdId: string, inviteToken: string) => Promise<void>;
  switchHousehold: (householdId: string) => Promise<void>;
  deleteHousehold: (householdId?: string) => Promise<void>;
  createInvite: (email?: string, role?: 'member' | 'viewer') => Promise<string>;
  inviteByEmail: (email: string, role?: 'member' | 'viewer') => Promise<string>;
  cancelEmailInvite: (inviteId: string) => Promise<void>;
  checkAndJoinPendingInvites: (manualEmail?: string) => Promise<{ found: boolean; householdName?: string; message: string }>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  addAccount: (data: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reorderAccounts: (newOrderedAccounts: Account[]) => Promise<void>;
  saveBudget: (month: string, categoryId: string, amount: number) => Promise<void>;
  adjustBudget: (month: string, categoryId: string, deltaAmount: number, syncOverall?: boolean) => Promise<void>;
  deleteBudget: (month: string, categoryId: string) => Promise<void>;
  updateJarsConfig: (config: Record<JarType, number>) => Promise<void>;
  updateJarCustomNames: (customNames: Record<JarType, string>) => Promise<void>;
  updateHouseholdSettings: (settings: Partial<Household>) => Promise<void>;
  autoAllocateSixJarsBudget: (month: string, targetIncome: number, customConfig?: Record<JarType, number>) => Promise<void>;
  normalizeSixJarsCategories: () => Promise<number>;
  addGoal: (data: Omit<SavingGoal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<SavingGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addRecurringRule: (data: Omit<RecurringRule, 'id' | 'createdAt'>) => Promise<void>;
  updateRecurringRule: (id: string, data: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  processRecurringRules: (rulesToExecute: RecurringRule[]) => Promise<void>;
  refreshPrevMonthData: () => Promise<void>;
  leaveHousehold: () => Promise<void>;
  removeMember: (memberUid: string) => Promise<void>;
  updateMemberRole: (memberUid: string, role: MemberRole) => Promise<void>;
  restoreHouseholdBackup: (
    backup: HouseholdBackupData,
    mode?: 'merge' | 'replace'
  ) => Promise<{
    txCount: number;
    categoriesCount: number;
    accountsCount: number;
    budgetsCount: number;
    goalsCount: number;
    rulesCount: number;
  }>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile, updateCurrentHouseholdId } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthStr);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overrideHouseholdId, setOverrideHouseholdId] = useState<string | null>(null);
  const [isCheckingInvites, setIsCheckingInvites] = useState<boolean>(true);
  const [pendingEmailInvites, setPendingEmailInvites] = useState<EmailInvite[]>([]);
  const [userHouseholds, setUserHouseholds] = useState<{ id: string; name: string; role: MemberRole }[]>([]);

  const activeHouseholdId = overrideHouseholdId || userProfile?.currentHouseholdId || localStorage.getItem('sonha_active_household');

  // Check and auto-join pending email invites or load existing household for user
  const checkAndJoinPendingInvites = useCallback(async (manualEmail?: string): Promise<{ found: boolean; householdName?: string; message: string }> => {
    if (!user) return { found: false, message: 'Chưa đăng nhập' };
    
    const targetEmail = (manualEmail || user.email || '').trim().toLowerCase();
    
    // 1. Search in top-level email_invites collection
    if (targetEmail) {
      try {
        const invitesQuery = query(
          collection(db, 'email_invites'),
          where('email', '==', targetEmail)
        );
        const snap = await getDocs(invitesQuery);
        const validInvites: EmailInvite[] = [];

        snap.forEach(d => {
          const inv = d.data() as EmailInvite;
          const notExpired = !inv.expiresAt || new Date(inv.expiresAt) > new Date();
          if (!inv.used && notExpired) {
            validInvites.push({ ...inv, id: d.id });
          }
        });

        // Fallback for case variation
        if (validInvites.length === 0 && (manualEmail || user.email || '').trim() !== targetEmail) {
          try {
            const rawSnap = await getDocs(query(collection(db, 'email_invites'), where('email', '==', (manualEmail || user.email || '').trim())));
            rawSnap.forEach(d => {
              const inv = d.data() as EmailInvite;
              const notExpired = !inv.expiresAt || new Date(inv.expiresAt) > new Date();
              if (!inv.used && notExpired) {
                validInvites.push({ ...inv, id: d.id });
              }
            });
          } catch (_) {}
        }

        validInvites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (validInvites.length > 0) {
          const chosen = validInvites[0];
          const targetHhId = chosen.householdId;
          const hhSnap = await getDoc(doc(db, 'households', targetHhId));

          if (hhSnap.exists()) {
            const hhData = hhSnap.data() as Household;
            const nowIso = new Date().toISOString();
            const memberDoc: Member = stripUndefined({
              uid: user.uid,
              displayName: user.displayName || userProfile?.displayName || user.email?.split('@')[0] || 'Thành viên mới',
              email: user.email || targetEmail,
              photoURL: user.photoURL || null,
              role: chosen.role || 'member',
              joinedAt: nowIso,
            });

            const batch = writeBatch(db);
            batch.update(doc(db, 'email_invites', chosen.id), {
              used: true,
              acceptedBy: user.uid,
              acceptedAt: nowIso,
            });
            batch.set(doc(db, 'households', targetHhId, 'members', user.uid), memberDoc);
            if (chosen.token) {
              const subInviteRef = doc(db, 'households', targetHhId, 'invites', chosen.token);
              batch.update(subInviteRef, { used: true });
            }

            await batch.commit();
            await updateCurrentHouseholdId(targetHhId);
            localStorage.setItem('sonha_active_household', targetHhId);
            setOverrideHouseholdId(targetHhId);
            return {
              found: true,
              householdName: hhData.name,
              message: `Đã kết nối và tự động tải sổ gia đình "${hhData.name}"!`,
            };
          }
        }
      } catch (err) {
        console.warn('Error checking pending email invites:', err);
      }
    }

    // 2. Check if user already has saved householdIds
    if (userProfile?.householdIds && userProfile.householdIds.length > 0) {
      for (const hhId of userProfile.householdIds) {
        try {
          const hhSnap = await getDoc(doc(db, 'households', hhId));
          if (hhSnap.exists()) {
            const hhData = hhSnap.data() as Household;
            await updateCurrentHouseholdId(hhId);
            localStorage.setItem('sonha_active_household', hhId);
            setOverrideHouseholdId(hhId);
            return {
              found: true,
              householdName: hhData.name,
              message: `Đã tải sổ gia đình "${hhData.name}"!`,
            };
          }
        } catch (_) {}
      }
    }

    // 3. Check if user created any households
    try {
      const createdSnap = await getDocs(query(collection(db, 'households'), where('createdBy', '==', user.uid)));
      if (!createdSnap.empty) {
        const firstDoc = createdSnap.docs[0];
        const hhData = firstDoc.data() as Household;
        await updateCurrentHouseholdId(firstDoc.id);
        localStorage.setItem('sonha_active_household', firstDoc.id);
        setOverrideHouseholdId(firstDoc.id);
        return {
          found: true,
          householdName: hhData.name,
          message: `Đã tải sổ gia đình "${hhData.name}"!`,
        };
      }
    } catch (_) {}

    return {
      found: false,
      message: targetEmail ? `Không tìm thấy lời mời nào cho email ${targetEmail}` : 'Không tìm thấy dữ liệu gia đình.',
    };
  }, [user, userProfile, updateCurrentHouseholdId]);

  // Guard to ensure auto check for invites/households runs only once per user UID session
  const hasAutoCheckedUidRef = useRef<string | null>(null);

  // Run auto check for pending invites on user auth or change
  useEffect(() => {
    if (!user) {
      hasAutoCheckedUidRef.current = null;
      setIsCheckingInvites(false);
      return;
    }

    // Already checked for this user session - prevent re-checking loop
    if (hasAutoCheckedUidRef.current === user.uid) {
      setIsCheckingInvites(false);
      return;
    }

    hasAutoCheckedUidRef.current = user.uid;
    let isMounted = true;
    setIsCheckingInvites(true);

    // Hard fallback timeout: never block UI for more than 2 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsCheckingInvites(false);
    }, 2000);

    const runAutoCheck = async () => {
      try {
        const currentActive = overrideHouseholdId || userProfile?.currentHouseholdId || localStorage.getItem('sonha_active_household');
        if (currentActive) {
          try {
            const hSnap = await getDoc(doc(db, 'households', currentActive));
            if (hSnap.exists()) {
              if (isMounted) setIsCheckingInvites(false);
              clearTimeout(safetyTimer);
              return;
            }
          } catch (_) {}
        }

        await checkAndJoinPendingInvites();
      } catch (err) {
        console.warn('Auto resolve household notice:', err);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setIsCheckingInvites(false);
      }
    };

    runAutoCheck();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [user?.uid, checkAndJoinPendingInvites, overrideHouseholdId, userProfile?.currentHouseholdId]);

  // Load list of households user has access to
  useEffect(() => {
    if (!user) {
      setUserHouseholds([]);
      return;
    }

    let isMounted = true;
    const loadUserHouseholds = async () => {
      const list: { id: string; name: string; role: MemberRole }[] = [];
      const knownIds = new Set<string>();

      if (userProfile?.householdIds) {
        userProfile.householdIds.forEach(id => {
          if (id) knownIds.add(id);
        });
      }
      if (activeHouseholdId) knownIds.add(activeHouseholdId);

      try {
        const createdSnap = await getDocs(query(collection(db, 'households'), where('createdBy', '==', user.uid)));
        createdSnap.forEach(d => knownIds.add(d.id));
      } catch (_) {}

      for (const hid of knownIds) {
        try {
          const hSnap = await getDoc(doc(db, 'households', hid));
          if (hSnap.exists()) {
            const hData = hSnap.data() as Household;
            let role: MemberRole = hData.createdBy === user.uid ? 'owner' : 'viewer';
            try {
              const mSnap = await getDoc(doc(db, 'households', hid, 'members', user.uid));
              if (mSnap.exists()) {
                role = (mSnap.data() as Member).role || role;
              }
            } catch (_) {}
            list.push({ id: hid, name: hData.name, role });
          }
        } catch (_) {}
      }

      if (isMounted) {
        setUserHouseholds(list);
      }
    };

    loadUserHouseholds();

    return () => {
      isMounted = false;
    };
  }, [user, userProfile?.householdIds, activeHouseholdId]);

  // Compute current user's role in this household
  const currentMember = members.find(m => m.uid === user?.uid);
  const userRole: MemberRole = currentMember ? currentMember.role : (household?.createdBy === user?.uid ? 'owner' : 'viewer');

  // Listen to Household document & Members
  useEffect(() => {
    if (!user || !activeHouseholdId) {
      setHousehold(null);
      setMembers([]);
      setTransactions([]);
      setCategories([]);
      setAccounts([]);
      setBudgets([]);
      setGoals([]);
      setRecurringRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const householdRef = doc(db, 'households', activeHouseholdId);
    const unsubHousehold = onSnapshot(
      householdRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        if (snap.exists()) {
          const data = snap.data() as Household;
          const cachedJars = localStorage.getItem('sonha_jars_config_' + activeHouseholdId);
          if (!data.jarsConfig && cachedJars) {
            try {
              data.jarsConfig = JSON.parse(cachedJars);
            } catch (_) {}
          }
          const cachedNames = localStorage.getItem('sonha_jar_names_' + activeHouseholdId);
          if (!data.jarCustomNames && cachedNames) {
            try {
              data.jarCustomNames = JSON.parse(cachedNames);
            } catch (_) {}
          }
          setHousehold(data);
        } else {
          setHousehold(null);
        }
      },
      (err) => {
        console.warn('Household snapshot notice:', err);
      }
    );

    // Members listener
    const membersRef = collection(db, 'households', activeHouseholdId, 'members');
    const unsubMembers = onSnapshot(
      membersRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: Member[] = [];
        snap.forEach(d => list.push(d.data() as Member));
        setMembers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Members snapshot notice:', err);
        setLoading(false);
      }
    );

    // Categories listener
    const categoriesRef = collection(db, 'households', activeHouseholdId, 'categories');
    const unsubCategories = onSnapshot(
      categoriesRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: Category[] = [];
        snap.forEach(d => list.push(d.data() as Category));
        setCategories(list);
      },
      (err) => console.warn('Categories snapshot notice:', err)
    );

    // Accounts listener
    const accountsRef = collection(db, 'households', activeHouseholdId, 'accounts');
    const unsubAccounts = onSnapshot(
      accountsRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: Account[] = [];
        snap.forEach(d => list.push(d.data() as Account));
        list.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setAccounts(list);
      },
      (err) => console.warn('Accounts snapshot notice:', err)
    );

    // Budgets listener for household (current and previous month for rollover)
    const prevMonthStr = getPreviousMonthStr(currentMonth);
    const budgetsQuery = query(
      collection(db, 'households', activeHouseholdId, 'budgets'),
      where('month', 'in', [currentMonth, prevMonthStr])
    );
    const unsubBudgets = onSnapshot(
      budgetsQuery,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: Budget[] = [];
        snap.forEach(d => list.push(d.data() as Budget));
        setAllBudgets(list);
        setBudgets(list.filter(b => b.month === currentMonth));
      },
      (err) => console.warn('Budgets snapshot notice:', err)
    );

    // Goals listener
    const goalsRef = collection(db, 'households', activeHouseholdId, 'goals');
    const unsubGoals = onSnapshot(
      goalsRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: SavingGoal[] = [];
        snap.forEach(d => list.push(d.data() as SavingGoal));
        setGoals(list);
      },
      (err) => console.warn('Goals snapshot notice:', err)
    );

    // Recurring Rules listener
    const recurringRef = collection(db, 'households', activeHouseholdId, 'recurringRules');
    const unsubRecurring = onSnapshot(
      recurringRef,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: RecurringRule[] = [];
        snap.forEach(d => list.push(d.data() as RecurringRule));
        setRecurringRules(list);
      },
      (err) => console.warn('Recurring rules snapshot notice:', err)
    );

    // Pending Email Invites for this household
    const emailInvitesQuery = query(
      collection(db, 'email_invites'),
      where('householdId', '==', activeHouseholdId)
    );
    const unsubEmailInvites = onSnapshot(
      emailInvitesQuery,
      (snap) => {
        const list: EmailInvite[] = [];
        snap.forEach(d => list.push(d.data() as EmailInvite));
        setPendingEmailInvites(list);
      },
      (err) => console.warn('Email invites listener notice:', err)
    );

    return () => {
      unsubHousehold();
      unsubMembers();
      unsubCategories();
      unsubAccounts();
      unsubBudgets();
      unsubGoals();
      unsubRecurring();
      unsubEmailInvites();
    };
  }, [user, activeHouseholdId, currentMonth]);

  // Current Month Transactions listener (optimized date bounds for low Firestore read costs)
  useEffect(() => {
    if (!user || !activeHouseholdId) return;

    const startOfMonth = `${currentMonth}-01`;
    const endOfMonth = `${currentMonth}-31`;

    const txQuery = query(
      collection(db, 'households', activeHouseholdId, 'transactions'),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc')
    );

    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        updateSnapshotMetadata(snap.metadata);
        const list: Transaction[] = [];
        snap.forEach(d => list.push(d.data() as Transaction));
        setTransactions(list);
      },
      (err) => {
        console.warn('Transactions query notice:', err);
      }
    );

    return () => unsubTx();
  }, [user, activeHouseholdId, currentMonth]);

  // Query previous month for comparative insights (one-off getDocs to minimize reads)
  const refreshPrevMonthData = useCallback(async () => {
    if (!user || !activeHouseholdId) return;
    const prevMonth = getPreviousMonthStr(currentMonth);
    const startOfPrev = `${prevMonth}-01`;
    const endOfPrev = `${prevMonth}-31`;

    try {
      const q = query(
        collection(db, 'households', activeHouseholdId, 'transactions'),
        where('date', '>=', startOfPrev),
        where('date', '<=', endOfPrev),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const list: Transaction[] = [];
      snap.forEach(d => list.push(d.data() as Transaction));
      setPrevMonthTransactions(list);
    } catch (err) {
      console.warn('Could not fetch previous month transactions:', err);
    }
  }, [user, activeHouseholdId, currentMonth]);

  useEffect(() => {
    refreshPrevMonthData();
  }, [refreshPrevMonthData]);

  // Compute Budget Rollover statistics (surplus rolled over / deficit carried forward)
  const budgetRollovers = useMemo(() => {
    const prevMonth = getPreviousMonthStr(currentMonth);
    const rolloverEnabled = household?.rolloverBudgetEnabled !== false; // default true
    return calculateBudgetRolloverStats(
      currentMonth,
      prevMonth,
      allBudgets,
      transactions,
      prevMonthTransactions,
      categories,
      household?.jarsConfig,
      rolloverEnabled
    );
  }, [
    currentMonth,
    allBudgets,
    transactions,
    prevMonthTransactions,
    categories,
    household?.jarsConfig,
    household?.rolloverBudgetEnabled,
  ]);

  // Create Household with defaults in atomic batch
  const createHousehold = async (name: string): Promise<string> => {
    if (!user) throw new Error('Cần đăng nhập để tạo gia đình');
    setError(null);

    const householdId = 'hh_' + generateSecureToken(12);
    const nowIso = new Date().toISOString();

    const newHousehold: Household = {
      id: householdId,
      name: name.trim(),
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      createdBy: user.uid,
      createdAt: nowIso,
      jarsConfig: {
        NEC: 55,
        FFA: 10,
        LTSS: 10,
        EDU: 10,
        PLAY: 10,
        GIVE: 5,
      },
    };

    const memberDoc: Record<string, any> = {
      uid: user.uid,
      displayName: user.displayName || userProfile?.displayName || 'Chủ gia đình',
      email: user.email || '',
      role: 'owner',
      joinedAt: nowIso,
    };
    if (user.photoURL) {
      memberDoc.photoURL = user.photoURL;
    }

    try {
      // 1. Create household document first
      await setDoc(doc(db, 'households', householdId), stripUndefined(newHousehold));
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      console.error('Lỗi khởi tạo document gia đình:', err);
      handleFirestoreError(err, OperationType.CREATE, `households/${householdId}`);
      return '';
    }

    try {
      // 2. Add owner to members subcollection
      await setDoc(doc(db, 'households', householdId, 'members', user.uid), stripUndefined(memberDoc));
    } catch (err) {
      console.error('Lỗi thêm chủ gia đình:', err);
      handleFirestoreError(err, OperationType.CREATE, `households/${householdId}/members/${user.uid}`);
    }

    try {
      // 3. Commit default categories (organized by 6 Jars) and accounts in atomic batch
      const seedBatch = writeBatch(db);

      // Default Expense Categories (with 6 JARS tags)
      DEFAULT_EXPENSE_CATEGORIES.forEach((cat, index) => {
        const catId = `cat_exp_${index + 1}`;
        seedBatch.set(doc(db, 'households', householdId, 'categories', catId), {
          ...cat,
          id: catId,
          createdBy: user.uid,
          createdAt: nowIso,
        });
      });

      // Default Income Categories
      DEFAULT_INCOME_CATEGORIES.forEach((cat, index) => {
        const catId = `cat_inc_${index + 1}`;
        seedBatch.set(doc(db, 'households', householdId, 'categories', catId), {
          ...cat,
          id: catId,
          createdBy: user.uid,
          createdAt: nowIso,
        });
      });

      // Default Accounts
      DEFAULT_ACCOUNTS.forEach((acc, index) => {
        const accId = `acc_${index + 1}`;
        seedBatch.set(doc(db, 'households', householdId, 'accounts', accId), {
          ...acc,
          id: accId,
          createdBy: user.uid,
          createdAt: nowIso,
        });
      });

      await seedBatch.commit();
    } catch (seedErr) {
      console.warn('Lỗi seed danh mục mặc định (sẽ dùng bộ nhớ đệm):', seedErr);
    }

    try {
      await updateCurrentHouseholdId(householdId);
    } catch (profileErr) {
      console.warn('Lỗi cập nhật householdId vào user profile:', profileErr);
    }

    localStorage.setItem('sonha_active_household', householdId);
    setOverrideHouseholdId(householdId);
    return householdId;
  };

  // Join Household with invite token
  const joinHouseholdWithInvite = async (householdId: string, inviteToken: string) => {
    if (!user) throw new Error('Cần đăng nhập để tham gia');
    setError(null);

    const cleanHhId = (householdId || '').trim();
    const cleanToken = (inviteToken || '').trim();

    if (!cleanHhId || !cleanToken) {
      throw new Error('Mã gia đình hoặc mã mời không hợp lệ.');
    }

    try {
      const targetMemberRef = doc(db, 'households', cleanHhId, 'members', user.uid);

      // 1. Check if user is ALREADY a member of the TARGET household
      try {
        const targetMemberSnap = await getDoc(targetMemberRef);
        if (targetMemberSnap.exists()) {
          // User already in this household -> simply switch to it!
          await updateCurrentHouseholdId(cleanHhId);
          localStorage.setItem('sonha_active_household', cleanHhId);
          setOverrideHouseholdId(cleanHhId);
          return;
        }
      } catch (checkErr) {
        // Not yet a member or permission check bypassed, proceed with invite
        console.log('Proceeding to join household with invite token:', cleanToken);
      }

      // 2. Fetch and validate invite
      const inviteRef = doc(db, 'households', cleanHhId, 'invites', cleanToken);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Mã mời không tồn tại hoặc đã bị xóa.');
      }

      const inviteData = inviteSnap.data() as HouseholdInvite;
      // Allow multiUse invites (e.g. open family QR code) to be used by multiple family members
      if (inviteData.used && !inviteData.multiUse) {
        throw new Error('Lời mời này đã được sử dụng trước đó.');
      }

      if (inviteData.expiresAt && new Date(inviteData.expiresAt) < new Date()) {
        throw new Error('Lời mời này đã hết hạn.');
      }

      // Check email match if invite is restricted
      if (inviteData.email && user.email && inviteData.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error(`Lời mời này chỉ dành cho tài khoản email ${inviteData.email}`);
      }

      const nowIso = new Date().toISOString();
      const memberDoc: Member = stripUndefined({
        uid: user.uid,
        displayName: user.displayName || userProfile?.displayName || 'Thành viên mới',
        email: user.email || '',
        photoURL: user.photoURL || null,
        role: inviteData.role || 'member',
        joinedAt: nowIso,
      });

      const batch = writeBatch(db);
      // Mark invite used if single-use, otherwise increment usage count
      if (!inviteData.multiUse) {
        batch.update(inviteRef, { 
          used: true,
          acceptedBy: user.uid,
          acceptedAt: nowIso
        });
      } else {
        batch.update(inviteRef, { 
          usedCount: (inviteData.usedCount || 0) + 1, 
          lastUsedAt: nowIso 
        });
      }
      // Add member to target household
      batch.set(targetMemberRef, memberDoc);

      await batch.commit();
      await updateCurrentHouseholdId(cleanHhId);
      localStorage.setItem('sonha_active_household', cleanHhId);
      setOverrideHouseholdId(cleanHhId);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  };

  // Switch between households user belongs to
  const switchHousehold = async (targetId: string) => {
    if (!targetId || targetId === activeHouseholdId) return;
    await updateCurrentHouseholdId(targetId);
    localStorage.setItem('sonha_active_household', targetId);
    setOverrideHouseholdId(targetId);
  };

  // Create invite token (can be email-specific or an open family QR code)
  const createInvite = async (email: string = '', role: 'member' | 'viewer' = 'member'): Promise<string> => {
    if (!activeHouseholdId || !household || !user) throw new Error('Không tìm thấy gia đình');
    const cleanedEmail = (email || '').trim().toLowerCase();
    const token = generateSecureToken(16);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const nowIso = new Date().toISOString();
    const isMultiUse = !cleanedEmail; // Open QR code is multi-use for all family members (spouse, children, relatives)

    const inviteDoc: HouseholdInvite = {
      id: token,
      email: cleanedEmail,
      role,
      createdBy: user.uid,
      createdAt: nowIso,
      used: false,
      multiUse: isMultiUse,
      usedCount: 0,
      expiresAt,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'households', activeHouseholdId, 'invites', token), inviteDoc);

    if (cleanedEmail) {
      const emailInviteId = `inv_${activeHouseholdId}_${token}`;
      const emailInviteDoc: EmailInvite = {
        id: emailInviteId,
        token,
        householdId: activeHouseholdId,
        householdName: household?.name || 'Sổ Gia Đình',
        email: cleanedEmail,
        role,
        createdBy: user.uid,
        createdByName: user.displayName || userProfile?.displayName || user.email || 'Chủ nhà',
        createdAt: nowIso,
        used: false,
        expiresAt,
      };
      batch.set(doc(db, 'email_invites', emailInviteId), emailInviteDoc);
    }

    try {
      await batch.commit();
      return token;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/invites/${token}`);
    }
  };

  // Invite directly by email address (for automatic discovery on login)
  const inviteByEmail = async (email: string, role: 'member' | 'viewer' = 'member'): Promise<string> => {
    if (!activeHouseholdId || !user) throw new Error('Không tìm thấy gia đình');
    const cleanedEmail = (email || '').trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      throw new Error('Vui lòng nhập địa chỉ email hợp lệ.');
    }

    const token = generateSecureToken(16);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const nowIso = new Date().toISOString();

    const inviteDoc: HouseholdInvite = {
      id: token,
      email: cleanedEmail,
      role,
      createdBy: user.uid,
      createdAt: nowIso,
      used: false,
      expiresAt,
    };

    const emailInviteId = `inv_${activeHouseholdId}_${token}`;
    const emailInviteDoc: EmailInvite = {
      id: emailInviteId,
      token,
      householdId: activeHouseholdId,
      householdName: household?.name || 'Sổ Gia Đình',
      email: cleanedEmail,
      role,
      createdBy: user.uid,
      createdByName: user.displayName || userProfile?.displayName || user.email || 'Chủ nhà',
      createdAt: nowIso,
      used: false,
      expiresAt,
    };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'households', activeHouseholdId, 'invites', token), inviteDoc);
      batch.set(doc(db, 'email_invites', emailInviteId), emailInviteDoc);
      await batch.commit();
      return token;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `email_invites/${emailInviteId}`);
      throw err;
    }
  };

  // Cancel / Revoke email invite
  const cancelEmailInvite = async (inviteId: string) => {
    if (!activeHouseholdId || !user) return;
    try {
      await deleteDoc(doc(db, 'email_invites', inviteId));
    } catch (err) {
      console.warn('Lỗi xóa lời mời email:', err);
    }
  };

  // Add transaction
  const addTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>
  ) => {
    if (!activeHouseholdId || !user) throw new Error('Chưa chọn gia đình');
    const id = 'tx_' + generateSecureToken(12);
    const nowIso = new Date().toISOString();

    const rawTx: any = {
      ...data,
      id,
      amount: Math.round(Math.abs(data.amount)),
      createdBy: user.uid,
      createdByName: user.displayName || userProfile?.displayName || 'Thành viên',
      createdAt: nowIso,
      updatedAt: nowIso,
      clientCreatedAt: nowIso,
      clientUpdatedAt: nowIso,
    };

    if (data.type !== 'transfer') {
      delete rawTx.toAccountId;
    }

    const tx: Transaction = stripUndefined(rawTx);

    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'transactions', id), tx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/transactions/${id}`);
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!activeHouseholdId) return;
    const nowIso = new Date().toISOString();
    const cleanData = stripUndefined(data);
    try {
      await setDoc(
        doc(db, 'households', activeHouseholdId, 'transactions', id),
        { ...cleanData, updatedAt: nowIso, clientUpdatedAt: nowIso },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/transactions/${id}`);
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    if (!activeHouseholdId) return;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/transactions/${id}`);
    }
  };

  // Add/Update Category
  const addCategory = async (data: Omit<Category, 'id'>) => {
    if (!activeHouseholdId) return;
    const id = 'cat_' + generateSecureToken(8);
    const newCat: Category = stripUndefined({ ...data, id, isDefault: false, createdAt: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'categories', id), newCat);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/categories/${id}`);
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    if (!activeHouseholdId) return;
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'categories', id), stripUndefined(data), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/categories/${id}`);
    }
  };

  // Add/Update Account
  const addAccount = async (data: Omit<Account, 'id' | 'createdAt'>) => {
    if (!activeHouseholdId) return;
    const id = 'acc_' + generateSecureToken(8);
    const order = data.order !== undefined ? data.order : accounts.length;
    const newAcc: Account = stripUndefined({ ...data, id, order, createdAt: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'accounts', id), newAcc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/accounts/${id}`);
    }
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    if (!activeHouseholdId) return;
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'accounts', id), stripUndefined(data), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/accounts/${id}`);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!activeHouseholdId) return;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/accounts/${id}`);
    }
  };

  const reorderAccounts = async (newOrderedAccounts: Account[]) => {
    if (!activeHouseholdId) return;
    setAccounts(newOrderedAccounts);
    try {
      const batch = writeBatch(db);
      newOrderedAccounts.forEach((acc, index) => {
        const ref = doc(db, 'households', activeHouseholdId, 'accounts', acc.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (err) {
      console.warn('Lỗi lưu thứ tự tài khoản:', err);
    }
  };

  // Save/Update Budget
  const saveBudget = async (month: string, categoryId: string, amount: number) => {
    if (!activeHouseholdId) return;
    const num = Math.round(amount);
    if (num <= 0) {
      await deleteBudget(month, categoryId);
      return;
    }
    const budgetId = `bgt_${month}_${categoryId}`;
    const budgetDoc: Budget = {
      id: budgetId,
      month,
      categoryId,
      amount: num,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'budgets', budgetId), budgetDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/budgets/${budgetId}`);
    }
  };

  // Delete Budget
  const deleteBudget = async (month: string, categoryId: string) => {
    if (!activeHouseholdId) return;
    const budgetId = `bgt_${month}_${categoryId}`;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'budgets', budgetId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/budgets/${budgetId}`);
    }
  };

  // Adjust / Add to Budget of a single category or jar without forced rebalance
  const adjustBudget = async (
    month: string,
    categoryId: string,
    deltaAmount: number,
    syncOverall: boolean = true
  ) => {
    if (!activeHouseholdId) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    const existingBudgetDoc = allBudgets.find(b => b.month === month && b.categoryId === categoryId);
    let currentAmount = existingBudgetDoc ? existingBudgetDoc.amount : 0;

    // If target is a jar and no explicit budget doc was stored yet, baseline from overall budget
    if (!existingBudgetDoc && categoryId.startsWith('jar_')) {
      const jarKey = categoryId.replace('jar_', '') as JarType;
      const overallDoc = allBudgets.find(b => b.month === month && b.categoryId === 'overall');
      if (overallDoc && overallDoc.amount > 0) {
        const pct = household?.jarsConfig?.[jarKey] !== undefined ? household.jarsConfig[jarKey] : SIX_JARS[jarKey].percent;
        currentAmount = Math.round((overallDoc.amount * pct) / 100);
      }
    }

    const newAmount = Math.max(0, currentAmount + Math.round(deltaAmount));

    const budgetId = `bgt_${month}_${categoryId}`;
    if (newAmount === 0) {
      batch.delete(doc(db, 'households', activeHouseholdId, 'budgets', budgetId));
    } else {
      batch.set(doc(db, 'households', activeHouseholdId, 'budgets', budgetId), {
        id: budgetId,
        month,
        categoryId,
        amount: newAmount,
        createdAt: existingBudgetDoc?.createdAt || nowIso,
      });
    }

    // If syncOverall is true and categoryId is not 'overall', adjust overall budget as well
    if (syncOverall && categoryId !== 'overall') {
      const overallDoc = allBudgets.find(b => b.month === month && b.categoryId === 'overall');
      const curOverall = overallDoc ? overallDoc.amount : 0;
      const newOverall = Math.max(0, curOverall + Math.round(deltaAmount));
      const overallId = `bgt_${month}_overall`;
      if (newOverall > 0) {
        batch.set(doc(db, 'households', activeHouseholdId, 'budgets', overallId), {
          id: overallId,
          month,
          categoryId: 'overall',
          amount: newOverall,
          createdAt: overallDoc?.createdAt || nowIso,
        });
      }
    }

    // If categoryId is a sub-category with an assigned jar, sync that jar's explicit doc if it exists
    if (syncOverall && !categoryId.startsWith('jar_') && categoryId !== 'overall') {
      const catObj = categories.find(c => c.id === categoryId);
      if (catObj?.jar) {
        const jarKey = `jar_${catObj.jar}`;
        const jarDoc = allBudgets.find(b => b.month === month && b.categoryId === jarKey);
        if (jarDoc && jarDoc.amount > 0) {
          const newJarAmount = Math.max(0, jarDoc.amount + Math.round(deltaAmount));
          const jarBudgetId = `bgt_${month}_${jarKey}`;
          batch.set(doc(db, 'households', activeHouseholdId, 'budgets', jarBudgetId), {
            id: jarBudgetId,
            month,
            categoryId: jarKey,
            amount: newJarAmount,
            createdAt: jarDoc.createdAt || nowIso,
          });
        }
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/budgets`);
    }
  };

  // Update Custom 6 Jars Percentage Configuration
  const updateJarsConfig = async (config: Record<JarType, number>) => {
    if (!activeHouseholdId) return;

    // Immediately update local React state and localStorage cache for instant UI feedback
    setHousehold(prev => (prev ? { ...prev, jarsConfig: config } : null));
    try {
      localStorage.setItem('sonha_jars_config_' + activeHouseholdId, JSON.stringify(config));
    } catch (_) {}

    try {
      await setDoc(
        doc(db, 'households', activeHouseholdId),
        { jarsConfig: config, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}`);
    }
  };

  // Update Custom Names for 6 Jars (e.g. GIVE -> "Dâng hiến", NEC -> "Sinh hoạt")
  const updateJarCustomNames = async (customNames: Record<JarType, string>) => {
    if (!activeHouseholdId) return;

    setHousehold(prev => (prev ? { ...prev, jarCustomNames: customNames } : null));
    try {
      localStorage.setItem('sonha_jar_names_' + activeHouseholdId, JSON.stringify(customNames));
    } catch (_) {}

    try {
      await setDoc(
        doc(db, 'households', activeHouseholdId),
        stripUndefined({ jarCustomNames: customNames, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}`);
    }
  };

  // Update Household Settings (e.g. rolloverBudgetEnabled)
  const updateHouseholdSettings = async (settings: Partial<Household>) => {
    if (!activeHouseholdId) return;
    setHousehold(prev => (prev ? { ...prev, ...settings } : null));

    try {
      await setDoc(
        doc(db, 'households', activeHouseholdId),
        stripUndefined({ ...settings, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}`);
    }
  };

  // Auto-allocate 6 Jars Budget based on monthly income
  const autoAllocateSixJarsBudget = async (
    month: string,
    targetIncome: number,
    customConfig?: Record<JarType, number>
  ) => {
    if (!activeHouseholdId || !user) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const config = customConfig || household?.jarsConfig || {
      NEC: 55,
      FFA: 10,
      LTSS: 10,
      EDU: 10,
      PLAY: 10,
      GIVE: 5,
    };

    // 1. Overall monthly budget
    const overallId = `bgt_${month}_overall`;
    batch.set(doc(db, 'households', activeHouseholdId, 'budgets', overallId), {
      id: overallId,
      month,
      categoryId: 'overall',
      amount: Math.round(targetIncome),
      createdAt: nowIso,
    });

    // 2. Budget for each jar
    const jarKeys: JarType[] = ['NEC', 'FFA', 'LTSS', 'EDU', 'PLAY', 'GIVE'];

    jarKeys.forEach(jarKey => {
      const pct = config[jarKey] !== undefined ? config[jarKey] : SIX_JARS[jarKey].percent;
      const jarAmount = Math.round((targetIncome * pct) / 100);

      const jarBudgetId = `bgt_${month}_jar_${jarKey}`;
      batch.set(doc(db, 'households', activeHouseholdId, 'budgets', jarBudgetId), {
        id: jarBudgetId,
        month,
        categoryId: `jar_${jarKey}`,
        amount: jarAmount,
        createdAt: nowIso,
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/budgets`);
    }
  };

  // Normalize / Ensure standard 6 Jars categories exist
  const normalizeSixJarsCategories = async (): Promise<number> => {
    if (!activeHouseholdId || !user) return 0;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    let count = 0;

    const existingNames = new Set(categories.map(c => c.name.toLowerCase()));

    DEFAULT_EXPENSE_CATEGORIES.forEach((cat, index) => {
      if (!existingNames.has(cat.name.toLowerCase())) {
        const catId = `cat_exp_jar_${index + 1}`;
        batch.set(doc(db, 'households', activeHouseholdId, 'categories', catId), {
          ...cat,
          id: catId,
          createdBy: user.uid,
          createdAt: nowIso,
        });
        count++;
      }
    });

    if (count > 0) {
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/categories`);
      }
    }
    return count;
  };

  // Goals
  const addGoal = async (data: Omit<SavingGoal, 'id' | 'createdAt'>) => {
    if (!activeHouseholdId) return;
    const id = 'goal_' + generateSecureToken(8);
    const newGoal: SavingGoal = stripUndefined({ ...data, id, createdAt: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'goals', id), newGoal);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/goals/${id}`);
    }
  };

  const updateGoal = async (id: string, data: Partial<SavingGoal>) => {
    if (!activeHouseholdId) return;
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'goals', id), stripUndefined(data), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/goals/${id}`);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!activeHouseholdId) return;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'goals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/goals/${id}`);
    }
  };

  // Recurring Rules
  const addRecurringRule = async (data: Omit<RecurringRule, 'id' | 'createdAt'>) => {
    if (!activeHouseholdId) return;
    const id = 'rec_' + generateSecureToken(8);
    const newRule: RecurringRule = stripUndefined({ ...data, id, createdAt: new Date().toISOString() });
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'recurringRules', id), newRule);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `households/${activeHouseholdId}/recurringRules/${id}`);
    }
  };

  const updateRecurringRule = async (id: string, data: Partial<RecurringRule>) => {
    if (!activeHouseholdId) return;
    try {
      await setDoc(doc(db, 'households', activeHouseholdId, 'recurringRules', id), stripUndefined(data), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/recurringRules/${id}`);
    }
  };

  const deleteRecurringRule = async (id: string) => {
    if (!activeHouseholdId) return;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'recurringRules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/recurringRules/${id}`);
    }
  };

  // Confirm and process recurring items (batch write transactions and update nextDueDate)
  const processRecurringRules = async (rulesToExecute: RecurringRule[]) => {
    if (!activeHouseholdId || !user) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    for (const rule of rulesToExecute) {
      const txId = 'tx_rec_' + generateSecureToken(8);
      const tx: Transaction = {
        id: txId,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        date: today,
        note: `[Định kỳ] ${rule.title}`,
        createdBy: user.uid,
        createdByName: user.displayName || 'Tự động',
        createdAt: nowIso,
        updatedAt: nowIso,
        clientCreatedAt: nowIso,
        clientUpdatedAt: nowIso,
      };

      batch.set(doc(db, 'households', activeHouseholdId, 'transactions', txId), tx);

      // Compute next due date based on frequency
      const [year, month, day] = rule.nextDueDate.split('-').map(Number);
      const nextDate = new Date(year, month - 1, day);
      if (rule.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (rule.frequency === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        // monthly
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const nextDueDateStr = nextDate.toISOString().slice(0, 10);
      batch.update(doc(db, 'households', activeHouseholdId, 'recurringRules', rule.id), {
        lastProcessedDate: today,
        nextDueDate: nextDueDateStr,
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/recurringRules`);
    }
  };

  const leaveHousehold = async () => {
    if (!activeHouseholdId || !user) return;
    if (userRole === 'owner' && members.filter(m => m.role === 'owner').length <= 1) {
      throw new Error('Bạn là chủ gia đình duy nhất. Hãy dùng nút "Xóa sổ gia đình" bên dưới hoặc chuyển quyền chủ nhà cho thành viên khác trước khi rời.');
    }
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'members', user.uid));
      
      const currentList = userProfile?.householdIds || [];
      const remaining = currentList.filter(id => id !== activeHouseholdId);
      if (remaining.length > 0) {
        await updateCurrentHouseholdId(remaining[0]);
        localStorage.setItem('sonha_active_household', remaining[0]);
        setOverrideHouseholdId(remaining[0]);
      } else {
        localStorage.removeItem('sonha_active_household');
        setOverrideHouseholdId(null);
        await updateCurrentHouseholdId('');
        setHousehold(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/members/${user.uid}`);
    }
  };

  // Delete Household permanently (Owner only)
  const deleteHousehold = async (targetHouseholdId?: string) => {
    const idToDelete = targetHouseholdId || activeHouseholdId;
    if (!idToDelete || !user) throw new Error('Không tìm thấy sổ gia đình để xóa');

    // Verify ownership
    const hDoc = await getDoc(doc(db, 'households', idToDelete));
    if (!hDoc.exists()) {
      throw new Error('Sổ gia đình không tồn tại hoặc đã bị xóa');
    }
    const hData = hDoc.data() as Household;
    const isCreator = hData.createdBy === user.uid;
    const currentMemberSnap = await getDoc(doc(db, 'households', idToDelete, 'members', user.uid));
    const isOwner = isCreator || (currentMemberSnap.exists() && currentMemberSnap.data()?.role === 'owner');

    if (!isOwner) {
      throw new Error('Chỉ chủ sở hữu gia đình mới có quyền xóa sổ gia đình này.');
    }

    try {
      // 1. Delete all subcollections
      const subcollections = [
        'transactions',
        'categories',
        'accounts',
        'budgets',
        'goals',
        'recurringRules',
        'invites',
        'members',
      ];

      for (const subName of subcollections) {
        try {
          const subSnap = await getDocs(collection(db, 'households', idToDelete, subName));
          if (!subSnap.empty) {
            const batch = writeBatch(db);
            subSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        } catch (err) {
          console.warn(`Could not clean subcollection ${subName}:`, err);
        }
      }

      // 2. Clean up any top-level email_invites for this household
      try {
        const emailInvSnap = await getDocs(
          query(collection(db, 'email_invites'), where('householdId', '==', idToDelete))
        );
        if (!emailInvSnap.empty) {
          const b = writeBatch(db);
          emailInvSnap.docs.forEach(d => b.delete(d.ref));
          await b.commit();
        }
      } catch (_) {}

      // 3. Delete household doc
      await deleteDoc(doc(db, 'households', idToDelete));

      // 4. Update user profile and storage
      const currentList = userProfile?.householdIds || [];
      const remaining = currentList.filter(id => id !== idToDelete);

      if (user) {
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              householdIds: remaining,
              currentHouseholdId: remaining.length > 0 ? remaining[0] : '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (_) {}
      }

      if (idToDelete === activeHouseholdId) {
        if (remaining.length > 0) {
          await updateCurrentHouseholdId(remaining[0]);
          localStorage.setItem('sonha_active_household', remaining[0]);
          setOverrideHouseholdId(remaining[0]);
        } else {
          await updateCurrentHouseholdId('');
          localStorage.removeItem('sonha_active_household');
          setOverrideHouseholdId(null);
          setHousehold(null);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${idToDelete}`);
      throw err;
    }
  };

  // Remove a member from household (owner only)
  const removeMember = async (memberUid: string) => {
    if (!activeHouseholdId || !user) throw new Error('Chưa chọn gia đình');
    if (userRole !== 'owner') {
      throw new Error('Chỉ chủ nhà mới có quyền xóa thành viên khỏi gia đình.');
    }
    if (memberUid === household?.createdBy) {
      throw new Error('Không thể xóa chủ nhà sáng lập gia đình.');
    }
    if (memberUid === user.uid) {
      throw new Error('Bạn không thể tự xóa bản thân. Hãy chọn "Rời gia đình" nếu muốn rời.');
    }

    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'members', memberUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `households/${activeHouseholdId}/members/${memberUid}`);
      throw err;
    }
  };

  // Update member role (owner only)
  const updateMemberRole = async (memberUid: string, role: MemberRole) => {
    if (!activeHouseholdId || !user) throw new Error('Chưa chọn gia đình');
    if (userRole !== 'owner') {
      throw new Error('Chỉ chủ nhà mới có quyền thay đổi vai trò thành viên.');
    }
    if (memberUid === household?.createdBy && role !== 'owner') {
      throw new Error('Người sáng lập gia đình luôn giữ quyền chủ nhà.');
    }

    try {
      await setDoc(
        doc(db, 'households', activeHouseholdId, 'members', memberUid),
        { role },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${activeHouseholdId}/members/${memberUid}`);
      throw err;
    }
  };

  // Restore household data from backup JSON
  const restoreHouseholdBackup = async (
    backup: HouseholdBackupData,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{
    txCount: number;
    categoriesCount: number;
    accountsCount: number;
    budgetsCount: number;
    goalsCount: number;
    rulesCount: number;
  }> => {
    if (!activeHouseholdId || !user) {
      throw new Error('Chưa chọn sổ gia đình để phục hồi dữ liệu.');
    }
    if (userRole === 'viewer') {
      throw new Error('Bạn có quyền Người xem, không thể phục hồi dữ liệu.');
    }

    const {
      household: bHousehold,
      categories: bCategories = [],
      accounts: bAccounts = [],
      transactions: bTransactions = [],
      budgets: bBudgets = [],
      goals: bGoals = [],
      recurringRules: bRules = [],
    } = backup;

    try {
      // 1. Update household settings if present in backup (jarsConfig, jarCustomNames, rolloverBudgetEnabled)
      if (bHousehold) {
        const updates: Partial<Household> = {};
        if (bHousehold.jarsConfig) updates.jarsConfig = bHousehold.jarsConfig;
        if (bHousehold.jarCustomNames) updates.jarCustomNames = bHousehold.jarCustomNames;
        if (bHousehold.rolloverBudgetEnabled !== undefined) updates.rolloverBudgetEnabled = bHousehold.rolloverBudgetEnabled;
        if (bHousehold.currency) updates.currency = bHousehold.currency;
        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, 'households', activeHouseholdId), updates, { merge: true });
        }
      }

      // 2. Prepare all document writes in batch chunks of 400
      type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;
      const operations: BatchOperation[] = [];

      // Categories
      bCategories.forEach((cat: Category) => {
        const catRef = doc(db, 'households', activeHouseholdId, 'categories', cat.id);
        operations.push(batch => batch.set(catRef, stripUndefined(cat), { merge: true }));
      });

      // Accounts
      bAccounts.forEach((acc: Account) => {
        const accRef = doc(db, 'households', activeHouseholdId, 'accounts', acc.id);
        operations.push(batch => batch.set(accRef, stripUndefined(acc), { merge: true }));
      });

      // Transactions
      bTransactions.forEach((tx: Transaction) => {
        const txRef = doc(db, 'households', activeHouseholdId, 'transactions', tx.id);
        operations.push(batch => batch.set(txRef, stripUndefined(tx), { merge: true }));
      });

      // Budgets
      bBudgets.forEach((b: Budget) => {
        const bRef = doc(db, 'households', activeHouseholdId, 'budgets', b.id);
        operations.push(batch => batch.set(bRef, stripUndefined(b), { merge: true }));
      });

      // Goals
      bGoals.forEach((g: SavingGoal) => {
        const gRef = doc(db, 'households', activeHouseholdId, 'goals', g.id);
        operations.push(batch => batch.set(gRef, stripUndefined(g), { merge: true }));
      });

      // Recurring Rules
      bRules.forEach((r: RecurringRule) => {
        const rRef = doc(db, 'households', activeHouseholdId, 'recurringRules', r.id);
        operations.push(batch => batch.set(rRef, stripUndefined(r), { merge: true }));
      });

      // Execute in chunks of 400
      const CHUNK_SIZE = 400;
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => op(batch));
        await batch.commit();
      }

      return {
        txCount: bTransactions.length,
        categoriesCount: bCategories.length,
        accountsCount: bAccounts.length,
        budgetsCount: bBudgets.length,
        goalsCount: bGoals.length,
        rulesCount: bRules.length,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `households/${activeHouseholdId}/restore`);
      throw err;
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        userRole,
        currentMonth,
        setCurrentMonth,
        transactions,
        prevMonthTransactions,
        categories,
        accounts,
        budgets,
        allBudgets,
        budgetRollovers,
        goals,
        recurringRules,
        loading,
        isCheckingInvites,
        error,
        pendingEmailInvites,
        userHouseholds,
        createHousehold,
        joinHouseholdWithInvite,
        switchHousehold,
        deleteHousehold,
        createInvite,
        inviteByEmail,
        cancelEmailInvite,
        checkAndJoinPendingInvites,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCategory,
        updateCategory,
        addAccount,
        updateAccount,
        deleteAccount,
        reorderAccounts,
        saveBudget,
        adjustBudget,
        deleteBudget,
        updateJarsConfig,
        updateJarCustomNames,
        updateHouseholdSettings,
        autoAllocateSixJarsBudget,
        normalizeSixJarsCategories,
        addGoal,
        updateGoal,
        deleteGoal,
        addRecurringRule,
        updateRecurringRule,
        deleteRecurringRule,
        processRecurringRules,
        refreshPrevMonthData,
        leaveHousehold,
        removeMember,
        updateMemberRole,
        restoreHouseholdBackup,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
