"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet, Handshake, Users, UserCheck, BadgePercent, CreditCard, 
  ArrowRightLeft,
  FileText,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Calendar,
  Filter,
  X,
  RefreshCw,
  Tag,
  CheckCircle2,
  Lock,
  Scale,
  Clock,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronRight,
  PieChart,
  Calculator,
  LineChart,
  Download,
  Settings,
  Bell,
  Layers,
  HelpCircle,
  DollarSign,
  ShieldAlert,
  Printer,
  ChevronDown,
  Info,
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Square,
  Minus,
  Plus,
  Coins,
  ReceiptText,
  Check,
  Target,
  PiggyBank,
  Edit,
  Trash2,
  Eye,
  PenTool,
  Share2,
  Copy
} from "lucide-react";
import {
  playCoinSound,
  playCashCounterSound,
  playWarningAlertSound,
  playGoalReachedSound,
  playEventSound,
  stopAllSounds,
} from "@/lib/sound";

interface Loan {
  id: string;
  title: string;
  role: "creditor" | "debtor";
  partnerName: string;
  linkedVaultId: string | null;
  vaultName?: string;
  vaultType?: string;
  startDate: string;
  startDateFormatted?: string;
  dueDate: string | null;
  dueDateFormatted?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  interestRate: number;
  interestType: "none" | "monthly" | "yearly" | "fixed_sum";
  interestDueTerm: string;
  confirmedCreditor: boolean;
  confirmedDebtor: boolean;
  status: "active" | "settled" | "overdue";
  notes?: string;
  agreementId?: string;
  createdAt?: string;
  agreementCreditorName?: string;
  agreementCreditorContact?: string;
  agreementDebtorName?: string;
  agreementDebtorContact?: string;
  agreementStatus?: string;
  creditorSignedAt?: string;
  debtorSignedAt?: string;
}

interface Vault {
  id: string;
  name: string;
  type: string;
  balance: number;
  desc?: string;
  isLocked?: boolean;
  lockedAmount?: number;
  lastRecordedAt?: string;
  daysInactive?: number;
}

interface Flow {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  fromVaultId?: string;
  toVaultId?: string;
  from: string;
  to: string;
  tag: string;
  isActual: boolean;
  isReconcile?: boolean;
  date: string;
  rawDate?: string;
}

interface Obligation {
  id: string;
  title: string;
  type: "receivable" | "payable" | "tax";
  role: "creditor" | "debtor";
  amount: number;
  partner?: string;
  formula?: string;
  interest?: string;
  dueDate?: string;
  status: string;
}

interface ReminderConfig {
  enabled: boolean;
  mode: "daily" | "countdown";
  dailyTime: string; // Khung giờ chốt sổ & xem tài chính
  reconcileTime?: string; // Khung giờ kiểm kê kho & đối chiếu
  countdownMinutes: number;
  soundType?: "coin" | "cash_counter";
  durationSeconds?: number;
  lastTriggeredDate?: string;
  countdownTarget?: number;
  volume?: number; // Âm lượng 0 - 100, mặc định 80
}

interface FinancialSystemSettings {
  plannedAdvanceNoticeDays: number; // Số ngày nhắc trước sự kiện dự chi/thu (ví dụ: 3 ngày)
  enablePlannedNotice: boolean; // Bật/tắt thông báo sự kiện dự chi/thu
  plannedNoticeScope: "all" | "selective"; // 'all': thông báo tất cả sự kiện; 'selective': chỉ thông báo các sự kiện được gán
  plannedSelectedFlowIds: string[]; // Danh sách id sự kiện dự chi/thu được gán thông báo
  maxNegativeDebtAllowed: number; // Ngưỡng âm nợ cho phép (VNĐ, ví dụ: 50.000.000)
  minVaultBalanceAllowed: number; // Ngưỡng tiền tối thiểu trong mỗi kho (VNĐ, ví dụ: 2.000.000)
  savingsGoalAmount: number; // Mục tiêu tiết kiệm tích lũy (VNĐ, ví dụ: 200.000.000)
  savingsGoalDeadline: string; // Hạn chót mục tiêu tiết kiệm
}

interface Reconciliation {
  id: string;
  vaultId: string;
  vaultName: string;
  systemBalance: number;
  actualBalance: number;
  difference: number;
  reason: string;
  actionTaken: string;
  createdAt: string;
}

export default function Home() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [reconciles, setReconciles] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab điều hướng chính chuẩn 7 mục SITEMAP
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home");

  // Modals
  const [showQuickRecordModal, setShowQuickRecordModal] = useState(false);
  const [showQuickIncomeModal, setShowQuickIncomeModal] = useState(false);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAlarmAlertModal, setShowAlarmAlertModal] = useState(false);

  // Helper lấy chuỗi ngày giờ hiện tại theo chuẩn Việt Nam (YYYY-MM-DD và HH:mm)
  const getCurrentDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return { dateStr, timeStr };
  };

  // Form Nhập Nhanh THU (+)
  const [quickIncomeForm, setQuickIncomeForm] = useState({
    amount: "",
    toVaultId: "",
    tag: "Doanh thu",
    title: "",
    isExpected: false, // true = người dùng tick chọn Dự kiến ngày, false = mặc định ngày hôm nay
    isActual: true,
    flowDate: new Date().toISOString().split("T")[0],
  });

  // Form Nhập Nhanh CHI (-)
  const [quickExpenseForm, setQuickExpenseForm] = useState({
    amount: "",
    fromVaultId: "",
    tag: "Chi phí",
    title: "",
    isExpected: false, // true = người dùng tick chọn Dự kiến ngày, false = mặc định ngày hôm nay
    isActual: true,
    flowDate: new Date().toISOString().split("T")[0],
  });

  // Cấu hình Chuông & Nhắc nhở Tài chính
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>({
    enabled: true,
    mode: "daily",
    dailyTime: "20:00",
    reconcileTime: "09:00",
    countdownMinutes: 60,
    soundType: "coin",
    durationSeconds: 4,
    volume: 80,
  });
  const [countdownText, setCountdownText] = useState("");
  const [isPlayingSoundTest, setIsPlayingSoundTest] = useState<"alert" | "income" | "expense" | "goal" | null>(null);

  // Cấu hình Hệ thống & Ngưỡng kiểm soát tài chính
  const [systemSettings, setSystemSettings] = useState<FinancialSystemSettings>({
    plannedAdvanceNoticeDays: 3, // Báo trước 3 ngày trước khi đến hạn dự chi/thu
    enablePlannedNotice: true,
    plannedNoticeScope: "all", // 'all' hoặc 'selective'
    plannedSelectedFlowIds: [], // các id sự kiện dự chi/thu được gán thông báo
    maxNegativeDebtAllowed: 50000000, // 50 triệu VNĐ
    minVaultBalanceAllowed: 2000000, // 2 triệu VNĐ
    savingsGoalAmount: 200000000, // 200 triệu VNĐ
    savingsGoalDeadline: "2026-12-31",
  });

  const handleSaveSystemSettings = (newSettings: FinancialSystemSettings) => {
    setSystemSettings(newSettings);
    try {
      localStorage.setItem("zmoney_system_settings", JSON.stringify(newSettings));
    } catch (_) {}
  };

  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedVaultForReconcile, setSelectedVaultForReconcile] = useState<Vault | null>(null);
  const [selectedVaultDetail, setSelectedVaultDetail] = useState<Vault | null>(null);

  // Form Thêm MoBo (Money Box)
  const [vaultForm, setVaultForm] = useState({
    name: "",
    type: "bank",
    balanceUnits: "", // Quy ước 1 = 1.000 VNĐ
    isNegativeDebt: false, // Ngữ cảnh đang vay nợ tại ngân hàng / thấu chi (-)
    description: "",
    isLocked: false,
    lockedAmountUnits: "", // Quy ước 1 = 1.000 VNĐ
  });

  // State Modal Sửa MoBo (Money Box)
  const [editingVault, setEditingVault] = useState<Vault | null>(null);
  const [editVaultForm, setEditVaultForm] = useState({
    name: "",
    type: "bank",
    balanceUnits: "",
    isNegativeDebt: false,
    description: "",
    isLocked: false,
    lockedAmountUnits: "",
  });

  // State Modal Xóa MoBo (Money Box)
  const [deletingVault, setDeletingVault] = useState<Vault | null>(null);
  // ==========================================
  // STATE CHỦ NỢ & CON NỢ (VAY - MƯỢN)
  // ==========================================
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanTabFilter, setLoanTabFilter] = useState<"all" | "creditor" | "debtor">("all");
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanForm, setLoanForm] = useState({
    title: "",
    role: "debtor" as "creditor" | "debtor",
    partnerName: "",
    linkedVaultId: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    amountUnits: "", // Quy ước 1 = 1.000 VNĐ
    interestRate: "0",
    interestType: "none" as "none" | "monthly" | "yearly" | "fixed_sum",
    interestDueTerm: "end_term",
    confirmedCreditor: false,
    confirmedDebtor: true,
    notes: "",
    syncMoBo: false,
  });

  const [activePayingLoan, setActivePayingLoan] = useState<Loan | null>(null);
  const [payingAmountUnits, setPayingAmountUnits] = useState("");
  const [payingVaultId, setPayingVaultId] = useState("");
  const [payingNote, setPayingNote] = useState("");
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // STATE THỎA THUẬN KÝ ĐIỆN TỬ (ID LIÊN KẾT & CHỮ KÝ CANVAS)
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    title: "",
    creatorRole: "creditor" as "creditor" | "debtor",
    creditorName: "",
    creditorContact: "",
    debtorName: "",
    debtorContact: "",
    amountUnits: "", // 1 = 1.000 VNĐ
    interestRate: "0",
    interestType: "none" as "none" | "monthly" | "yearly" | "fixed_sum",
    interestDueTerm: "end_term",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    linkedVaultId: "",
    terms: "Hai bên cam kết tự nguyện thỏa thuận vay và cho vay đúng theo các điều khoản ghi trong thỏa thuận này.",
  });
  const [createdAgreementResult, setCreatedAgreementResult] = useState<any | null>(null);
  const [agreementLinkCopied, setAgreementLinkCopied] = useState(false);
  const [isCreatingAgreement, setIsCreatingAgreement] = useState(false);

  const [targetTransferVaultId, setTargetTransferVaultId] = useState<string>("");

  // Form Ghi Nhanh / Tạo Dòng Chảy
  const [flowForm, setFlowForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    fromVaultId: "",
    toVaultId: "",
    fromTitle: "",
    toTitle: "",
    tag: "Chi tiêu",
    isActual: true,
    flowDate: new Date().toISOString().split("T")[0],
  });

  // State Modal Trung Tâm Thông Báo Hệ Thống
  const [notifCenterTab, setNotifCenterTab] = useState<"alerts" | "history">("alerts");
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("zmoney_read_alert_ids");
        return saved ? JSON.parse(saved) : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  });

  // State Bộ Lọc Thu Chi Trang Chủ (Khối 3)
  const [homeFilterRange, setHomeFilterRange] = useState<"all" | "today" | "7days" | "month" | "custom">("all");
  const [homeFilterStartDate, setHomeFilterStartDate] = useState<string>("");
  const [homeFilterEndDate, setHomeFilterEndDate] = useState<string>("");
  const [homeFilterType, setHomeFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [homeFilterVault, setHomeFilterVault] = useState<string>("");
  const [homeFilterTag, setHomeFilterTag] = useState<string>("");

  // Form Đối Chiếu Số Dư Thực Tế (Mục 2.6)
  const [reconcileForm, setReconcileForm] = useState({
    actualBalance: "",
    reason: "Đối chiếu kiểm đếm định kỳ",
    assignAsFlow: false,
    flowTag: "Chênh lệch đối chiếu",
  });

  // State Modal Trung Tâm Thông Báo Hệ Thống (Xem tất cả cảnh báo: Dự chi/thu, Ngưỡng nợ, Hạn mức kho, Miss báo cáo...)
  const [showNotificationCenterModal, setShowNotificationCenterModal] = useState(false);

  // State Modal Sửa / Xóa Dòng Chảy & Sự Kiện Dự Chi / Thu
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [editFlowForm, setEditFlowForm] = useState({
    title: "",
    amountUnits: "", // Lưu dạng đơn vị (quy ước 1 = 1.000 VNĐ)
    flowDate: "",
    tag: "",
    fromVaultId: "",
    toVaultId: "",
  });
  const [flowToDelete, setFlowToDelete] = useState<Flow | null>(null);

  // State Modal Popup Chỉnh Sửa Số Liệu Cài Đặt (Quy ước 1 = 1.000 VNĐ)
  const [settingEditModal, setSettingEditModal] = useState<{
    isOpen: boolean;
    key: "maxNegativeDebtAllowed" | "minVaultBalanceAllowed" | "savingsGoalAmount" | null;
    title: string;
    description: string;
    currentValue: number;
    inputUnits: string; // nhập số dạng 1 = 1.000 VNĐ
  }>({
    isOpen: false,
    key: null,
    title: "",
    description: "",
    currentValue: 0,
    inputUnits: "",
  });

  // Filter Sổ Ghi Tổng (Mục 2.2)
  const [filterVault, setFilterVault] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Máy tính Mục 4: Định Giá & Hòa Vốn
  const [pricingCalc, setPricingCalc] = useState({
    productName: "Gói Dịch Vụ Thiết Kế Web Pro",
    variableCost: 2500000, // Chi phí biến đổi (hosting, nhân công...)
    fixedCostAlloc: 1500000, // Chi phí cố định phân bổ
    targetMarginPct: 40, // Biên lợi nhuận mong muốn (%)
    expectedUnits: 10, // Sản lượng dự kiến
  });

  // Máy tính Mục 5: Giả lập kịch bản dòng tiền
  const [simulationParams, setSimulationParams] = useState({
    delayExpenses: false,
    speedupReceivables: false,
    increasePricePct: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Vaults
      const vRes = await fetch("/api/vaults");
      const vData = await vRes.json();
      if (vData.success) setVaults(vData.data);

      // 2. Flows (với filter)
      const q = new URLSearchParams();
      if (filterVault) q.append("vaultId", filterVault);
      if (filterTag) q.append("tag", filterTag);
      if (filterStatus !== "all") q.append("status", filterStatus);
      if (filterStartDate) q.append("startDate", filterStartDate);
      if (filterEndDate) q.append("endDate", filterEndDate);

      const fRes = await fetch(`/api/flows?${q.toString()}`);
      const fData = await fRes.json();
      if (fData.success) setFlows(fData.data);

      // 3. Obligations
      const oRes = await fetch("/api/obligations");
      const oData = await oRes.json();
      if (oData.success) setObligations(oData.data);

      // 4. Reconciliations
      const rRes = await fetch("/api/reconcile");
      const rData = await rRes.json();
      if (rData.success) setReconciles(rData.data);
      // 5. Loans (Chủ Nợ & Con NỢ)
      const lRes = await fetch("/api/loans");
      const lData = await lRes.json();
      if (lData.success) setLoans(lData.data);
    } catch (err) {
      console.error("Lỗi nạp dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterVault, filterTag, filterStatus, filterStartDate, filterEndDate]);

  // Khởi tạo notification permission và load config từ localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    try {
      const saved = localStorage.getItem("zmoney_reminder_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        setReminderConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch (_) {}

    try {
      const savedSettings = localStorage.getItem("zmoney_system_settings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSystemSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
    } catch (_) {}
  }, []);

  // Vòng lặp Timer kiểm tra nhắc nhở
  useEffect(() => {
    const interval = setInterval(() => {
      if (!reminderConfig.enabled) return;

      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toISOString().split("T")[0];

      if (reminderConfig.mode === "daily") {
        if (currentHHMM === reminderConfig.dailyTime && reminderConfig.lastTriggeredDate !== todayStr) {
          triggerAlarm(todayStr);
        }
      } else if (reminderConfig.mode === "countdown" && reminderConfig.countdownTarget) {
        const diff = reminderConfig.countdownTarget - Date.now();
        if (diff <= 0) {
          triggerAlarm();
          setReminderConfig((prev) => {
            const upd = { ...prev, countdownTarget: undefined };
            try { localStorage.setItem("zmoney_reminder_config", JSON.stringify(upd)); } catch (_) {}
            return upd;
          });
          setCountdownText("");
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setCountdownText(`${m}p ${s}s`);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [reminderConfig]);

  const triggerAlarm = (todayStr?: string) => {
    if (todayStr) {
      setReminderConfig((prev) => {
        const upd = { ...prev, lastTriggeredDate: todayStr };
        try { localStorage.setItem("zmoney_reminder_config", JSON.stringify(upd)); } catch (_) {}
        return upd;
      });
    }

    const vol = (reminderConfig.volume ?? 80) / 100;
    // Báo thức sự kiện nhắc nhở tài chính kích hoạt chuông cảnh báo 3 hồi ngắt quãng
    playWarningAlertSound(vol, 3);

    setShowAlarmAlertModal(true);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("⏰ Zmoney: Đến giờ chốt sổ & xem tài chính!", {
          body: "Chuông nhắc nhở kiểm tra dòng tiền và tài sản ròng hôm nay đã kích hoạt.",
        });
      } catch (_) {}
    }
  };

  const handleTestSound = (event: "alert" | "income" | "expense" | "goal") => {
    stopAllSounds();
    setIsPlayingSoundTest(event);
    const vol = (reminderConfig.volume ?? 80) / 100;
    playEventSound(event, vol, 3);
    setTimeout(() => {
      setIsPlayingSoundTest((cur) => (cur === event ? null : cur));
    }, 2400);
  };

  const handleStopSoundTest = () => {
    stopAllSounds();
    setIsPlayingSoundTest(null);
  };

  const handleSaveReminder = (newConfig: ReminderConfig) => {
    setReminderConfig(newConfig);
    try {
      localStorage.setItem("zmoney_reminder_config", JSON.stringify(newConfig));
    } catch (_) {}
  };

  const requestNotifyPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        if (res === "granted") {
          alert("Đã cấp quyền thông báo thành công!");
        }
      } catch (err: any) {
        alert("Lỗi xin quyền: " + err.message);
      }
    }
  };

  // Submit Nhập Nhanh THU (+)
  const handleQuickIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(quickIncomeForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return alert("Vui lòng nhập số tiền thu hợp lệ (> 0)");
    }
    if (!quickIncomeForm.toVaultId) {
      return alert("Vui lòng chọn Kho nhận tiền");
    }

    const v = vaults.find((item) => item.id === quickIncomeForm.toVaultId);
    const vaultName = v ? v.name : "Kho nhận";
    const title = quickIncomeForm.title.trim() || `Thu: ${quickIncomeForm.tag} ➔ ${vaultName}`;

    const isActual = quickIncomeForm.isExpected ? false : true;
    const flowDate = quickIncomeForm.isExpected 
      ? (quickIncomeForm.flowDate || new Date().toISOString().split("T")[0])
      : new Date().toISOString().split("T")[0];

    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isActual ? title : `[Dự kiến] ${title}`,
          amount,
          type: "income",
          fromVaultId: null,
          toVaultId: quickIncomeForm.toVaultId,
          fromTitle: "Nguồn thu bên ngoài",
          toTitle: vaultName,
          tag: quickIncomeForm.tag,
          isActual,
          flowDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowQuickIncomeModal(false);
        setQuickIncomeForm({
          amount: "",
          toVaultId: vaults[0]?.id || "",
          tag: "Doanh thu",
          title: "",
          isExpected: false,
          isActual: true,
          flowDate: new Date().toISOString().split("T")[0],
        });
        if (isActual) playCoinSound(1.2);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi ghi nhận thu: " + err.message);
    }
  };

  // Submit Nhập Nhanh CHI (-)
  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(quickExpenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return alert("Vui lòng nhập số tiền chi hợp lệ (> 0)");
    }
    if (!quickExpenseForm.fromVaultId) {
      return alert("Vui lòng chọn Kho xuất tiền chi");
    }

    const v = vaults.find((item) => item.id === quickExpenseForm.fromVaultId);
    const vaultName = v ? v.name : "Kho chi";
    const title = quickExpenseForm.title.trim() || `Chi: ${quickExpenseForm.tag} từ ${vaultName}`;

    const isActual = quickExpenseForm.isExpected ? false : true;
    const flowDate = quickExpenseForm.isExpected 
      ? (quickExpenseForm.flowDate || new Date().toISOString().split("T")[0])
      : new Date().toISOString().split("T")[0];

    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isActual ? title : `[Dự kiến] ${title}`,
          amount,
          type: "expense",
          fromVaultId: quickExpenseForm.fromVaultId,
          toVaultId: null,
          fromTitle: vaultName,
          toTitle: "Bên nhận chi",
          tag: quickExpenseForm.tag,
          isActual,
          flowDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowQuickExpenseModal(false);
        setQuickExpenseForm({
          amount: "",
          fromVaultId: vaults[0]?.id || "",
          tag: "Chi phí",
          title: "",
          isExpected: false,
          isActual: true,
          flowDate: new Date().toISOString().split("T")[0],
        });
        if (isActual) playCashCounterSound(1.5);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi ghi nhận chi: " + err.message);
    }
  };

  // Submit MoBo (Money Box) Mới
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.name.trim()) return alert("Vui lòng nhập tên MoBo");
    try {
      const units = parseFloat(vaultForm.balanceUnits) || 0;
      let realBalance = Math.round(units * 1000);
      if (vaultForm.isNegativeDebt) {
        realBalance = -Math.abs(realBalance);
      }
      const lockedUnits = parseFloat(vaultForm.lockedAmountUnits) || 0;
      const realLocked = Math.round(lockedUnits * 1000);

      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vaultForm.name.trim(),
          type: vaultForm.type,
          balance: realBalance,
          description: vaultForm.description,
          isLocked: vaultForm.isLocked,
          lockedAmount: realLocked,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVaultModal(false);
        setVaultForm({
          name: "",
          type: "bank",
          balanceUnits: "",
          isNegativeDebt: false,
          description: "",
          isLocked: false,
          lockedAmountUnits: "",
        });
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi thêm MoBo: " + err.message);
    }
  };

  // Mở Modal Sửa MoBo
  const openEditVaultModal = (vault: Vault) => {
    setEditingVault(vault);
    const isNegative = vault.balance < 0;
    const balanceAbs = Math.abs(vault.balance);
    const balanceUnits = balanceAbs > 0 ? (balanceAbs / 1000).toString() : "";
    const lockedUnits = (vault.lockedAmount || 0) > 0 ? ((vault.lockedAmount || 0) / 1000).toString() : "";

    setEditVaultForm({
      name: vault.name,
      type: vault.type,
      balanceUnits,
      isNegativeDebt: isNegative,
      description: vault.desc || "",
      isLocked: !!vault.isLocked,
      lockedAmountUnits: lockedUnits,
    });
  };

  // Submit Cập Nhật MoBo
  const handleUpdateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVault) return;
    if (!editVaultForm.name.trim()) return alert("Vui lòng nhập tên MoBo");

    try {
      const units = parseFloat(editVaultForm.balanceUnits) || 0;
      let realBalance = Math.round(units * 1000);
      if (editVaultForm.isNegativeDebt) {
        realBalance = -Math.abs(realBalance);
      }
      const lockedUnits = parseFloat(editVaultForm.lockedAmountUnits) || 0;
      const realLocked = Math.round(lockedUnits * 1000);

      const res = await fetch("/api/vaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVault.id,
          name: editVaultForm.name.trim(),
          type: editVaultForm.type,
          balance: realBalance,
          description: editVaultForm.description,
          isLocked: editVaultForm.isLocked,
          lockedAmount: realLocked,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingVault(null);
        await fetchData();
      } else {
        alert("Lỗi cập nhật MoBo: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  // Mở Modal Xóa MoBo (bắt buộc balance = 0 hoặc kết chuyển)
  const openDeleteVaultModal = (vault: Vault) => {
    setDeletingVault(vault);
    const otherVaults = vaults.filter((v) => v.id !== vault.id);
    setTargetTransferVaultId(otherVaults[0]?.id || "");
  };

  // Xác nhận Xóa MoBo
  const handleDeleteVaultConfirm = async () => {
    if (!deletingVault) return;

    const hasBalance = Math.abs(deletingVault.balance) > 0.001;
    if (hasBalance && !targetTransferVaultId) {
      return alert("Vui lòng chọn MoBo đích để kết chuyển số dư (+/-) trước khi xóa!");
    }

    try {
      const res = await fetch("/api/vaults", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deletingVault.id,
          targetVaultId: hasBalance ? targetTransferVaultId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDeletingVault(null);
        await fetchData();
      } else {
        alert("Không thể xóa MoBo: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi xóa MoBo: " + err.message);
    }
  };

  // ==========================================
  // HANDLERS CHỦ NỢ & CON NỢ (VAY - MƯỢN)
  // ==========================================
  const handleOpenCreateLoan = (role: "creditor" | "debtor" = "debtor") => {
    setEditingLoan(null);
    setLoanForm({
      title: "",
      role,
      partnerName: "",
      linkedVaultId: vaults.length > 0 ? vaults[0].id : "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      amountUnits: "",
      interestRate: "0",
      interestType: "none",
      interestDueTerm: "end_term",
      confirmedCreditor: role === "creditor",
      confirmedDebtor: role === "debtor",
      notes: "",
      syncMoBo: false,
    });
    setShowLoanModal(true);
  };

  const handleOpenEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanForm({
      title: loan.title,
      role: loan.role,
      partnerName: loan.partnerName,
      linkedVaultId: loan.linkedVaultId || (vaults.length > 0 ? vaults[0].id : ""),
      startDate: loan.startDate || new Date().toISOString().split("T")[0],
      dueDate: loan.dueDate || "",
      amountUnits: (loan.amount / 1000).toString(),
      interestRate: loan.interestRate.toString(),
      interestType: loan.interestType,
      interestDueTerm: loan.interestDueTerm,
      confirmedCreditor: loan.confirmedCreditor,
      confirmedDebtor: loan.confirmedDebtor,
      notes: loan.notes || "",
      syncMoBo: false,
    });
    setShowLoanModal(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.title.trim()) return alert("Vui lòng nhập tên/tiêu đề khoản nợ");
    if (!loanForm.partnerName.trim()) return alert("Vui lòng nhập tên đối tác vay / cho vay");
    const units = parseFloat(loanForm.amountUnits);
    if (isNaN(units) || units <= 0) return alert("Vui lòng nhập số tiền hợp lệ (> 0). Quy ước 1 = 1.000 VNĐ.");

    const realAmount = Math.round(units * 1000);

    try {
      if (editingLoan) {
        // Cập nhật
        const res = await fetch("/api/loans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLoan.id,
            title: loanForm.title,
            role: loanForm.role,
            partnerName: loanForm.partnerName,
            linkedVaultId: loanForm.linkedVaultId || null,
            startDate: loanForm.startDate,
            dueDate: loanForm.dueDate || null,
            amount: realAmount,
            interestRate: parseFloat(loanForm.interestRate) || 0,
            interestType: loanForm.interestType,
            interestDueTerm: loanForm.interestDueTerm,
            notes: loanForm.notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowLoanModal(false);
          setEditingLoan(null);
          await fetchData();
        } else {
          alert("Lỗi: " + data.error);
        }
      } else {
        // Tạo mới
        const res = await fetch("/api/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: loanForm.title,
            role: loanForm.role,
            partnerName: loanForm.partnerName,
            linkedVaultId: loanForm.linkedVaultId || null,
            startDate: loanForm.startDate,
            dueDate: loanForm.dueDate || null,
            amount: realAmount,
            interestRate: parseFloat(loanForm.interestRate) || 0,
            interestType: loanForm.interestType,
            interestDueTerm: loanForm.interestDueTerm,
            confirmedCreditor: loanForm.confirmedCreditor,
            confirmedDebtor: loanForm.confirmedDebtor,
            notes: loanForm.notes,
            syncMoBo: loanForm.syncMoBo,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShowLoanModal(false);
          await fetchData();
        } else {
          alert("Lỗi: " + data.error);
        }
      }
    } catch (err: any) {
      alert("Lỗi khi lưu khoản vay: " + err.message);
    }
  };

  const handleToggleLoanConfirm = async (loan: Loan, targetSide?: "creditor" | "debtor", confirmBoth = false) => {
    try {
      const res = await fetch("/api/loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loan.id,
          action: "toggle_confirm",
          targetSide,
          confirmBoth,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleOpenPayLoan = (loan: Loan) => {
    setActivePayingLoan(loan);
    setPayingAmountUnits((loan.remainingAmount / 1000).toString());
    setPayingVaultId(loan.linkedVaultId || (vaults.length > 0 ? vaults[0].id : ""));
    setPayingNote("");
  };

  const handleSubmitPayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayingLoan) return;
    const units = parseFloat(payingAmountUnits);
    if (isNaN(units) || units <= 0) return alert("Vui lòng nhập số tiền thanh toán (> 0)");
    const realPayment = Math.round(units * 1000);

    try {
      const res = await fetch("/api/loans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activePayingLoan.id,
          action: "pay",
          paymentAmount: realPayment,
          payVaultId: payingVaultId || null,
          note: payingNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePayingLoan(null);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleOpenCreateAgreement = () => {
    setCreatedAgreementResult(null);
    setAgreementLinkCopied(false);
    const defaultVault = vaults.length > 0 ? vaults[0] : null;
    setAgreementForm({
      title: "",
      creatorRole: "creditor",
      creditorName: defaultVault ? defaultVault.name : "Chủ Nợ",
      creditorContact: "",
      debtorName: "",
      debtorContact: "",
      amountUnits: "",
      interestRate: "0",
      interestType: "none",
      interestDueTerm: "end_term",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      linkedVaultId: defaultVault ? defaultVault.id : "",
      terms: "Hai bên cam kết tự nguyện thỏa thuận vay và cho vay đúng theo các điều khoản ghi trong thỏa thuận này.",
    });
    setShowAgreementModal(true);
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementForm.title.trim()) return alert("Vui lòng nhập mục đích vay");
    if (!agreementForm.creditorName.trim()) return alert("Vui lòng nhập họ tên Chủ Nợ");
    if (!agreementForm.debtorName.trim()) return alert("Vui lòng nhập họ tên Con Nợ");

    const units = parseFloat(agreementForm.amountUnits);
    if (isNaN(units) || units <= 0) return alert("Vui lòng nhập số tiền hợp lệ (> 0). Quy ước 1 = 1.000 VNĐ.");
    const realAmount = Math.round(units * 1000);

    try {
      setIsCreatingAgreement(true);
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: agreementForm.title,
          creatorRole: agreementForm.creatorRole,
          creditorName: agreementForm.creditorName,
          creditorContact: agreementForm.creditorContact,
          debtorName: agreementForm.debtorName,
          debtorContact: agreementForm.debtorContact,
          amount: realAmount,
          interestRate: parseFloat(agreementForm.interestRate) || 0,
          interestType: agreementForm.interestType,
          interestDueTerm: agreementForm.interestDueTerm,
          startDate: agreementForm.startDate,
          dueDate: agreementForm.dueDate || null,
          linkedVaultId: agreementForm.linkedVaultId || null,
          terms: agreementForm.terms,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedAgreementResult(data.data);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi tạo thỏa thuận: " + err.message);
    } finally {
      setIsCreatingAgreement(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loanToDelete) return;
    try {
      const res = await fetch("/api/loans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loanToDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        setLoanToDelete(null);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  // Submit Dòng Chảy / Ghi Nhanh
  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(flowForm.amount);
    if (!flowForm.title || isNaN(amount) || amount <= 0) {
      return alert("Vui lòng nhập tiêu đề và số tiền hợp lệ (> 0)");
    }

    let fTitle = flowForm.fromTitle;
    let tTitle = flowForm.toTitle;
    if (flowForm.fromVaultId) {
      const v = vaults.find((item) => item.id === flowForm.fromVaultId);
      if (v) fTitle = v.name;
    }
    if (flowForm.toVaultId) {
      const v = vaults.find((item) => item.id === flowForm.toVaultId);
      if (v) tTitle = v.name;
    }

    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...flowForm,
          amount,
          fromTitle: fTitle,
          toTitle: tTitle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowQuickRecordModal(false);
        setFlowForm({
          title: "",
          amount: "",
          type: "expense",
          fromVaultId: "",
          toVaultId: "",
          fromTitle: "",
          toTitle: "",
          tag: "Chi tiêu",
          isActual: true,
          flowDate: new Date().toISOString().split("T")[0],
        });
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi tạo giao dịch: " + err.message);
    }
  };

  // Mở modal sửa Flow (Quy ước 1 = 1.000 VNĐ)
  const handleOpenEditFlow = (flow: Flow) => {
    let dateStr = "";
    if (flow.rawDate) {
      try {
        dateStr = new Date(flow.rawDate).toISOString().split("T")[0];
      } catch (_) {
        dateStr = flow.rawDate;
      }
    } else if (flow.date && flow.date.includes("/")) {
      const parts = flow.date.split("/");
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Quy ước 1 = 1.000 VNĐ: chia cho 1000
    const units = (flow.amount / 1000).toString();

    setEditingFlow(flow);
    setEditFlowForm({
      title: flow.title,
      amountUnits: units,
      flowDate: dateStr,
      tag: flow.tag,
      fromVaultId: flow.fromVaultId || "",
      toVaultId: flow.toVaultId || "",
    });
  };

  // Lưu chỉnh sửa Flow (nhập đơn vị -> nhân 1.000 ra VNĐ)
  const handleUpdateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlow) return;

    const units = parseFloat(editFlowForm.amountUnits);
    if (isNaN(units) || units <= 0) {
      return alert("Vui lòng nhập số hợp lệ (> 0). Ví dụ nhập 20 = 20.000đ, 50000 = 50.000.000đ");
    }
    const realAmount = Math.round(units * 1000);

    let fromTitle = editingFlow.from;
    let toTitle = editingFlow.to;
    if (editFlowForm.fromVaultId) {
      const v = vaults.find((item) => item.id === editFlowForm.fromVaultId);
      if (v) fromTitle = v.name;
    }
    if (editFlowForm.toVaultId) {
      const v = vaults.find((item) => item.id === editFlowForm.toVaultId);
      if (v) toTitle = v.name;
    }

    try {
      const res = await fetch("/api/flows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFlow.id,
          title: editFlowForm.title,
          amount: realAmount,
          tag: editFlowForm.tag,
          flowDate: editFlowForm.flowDate,
          fromVaultId: editFlowForm.fromVaultId || null,
          toVaultId: editFlowForm.toVaultId || null,
          fromTitle,
          toTitle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingFlow(null);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi cập nhật giao dịch: " + err.message);
    }
  };

  // Thực hiện ngay một khoản dự thu / dự chi: chuyển sang thực tế và trừ/cộng MoBo ngay
  const handleExecutePlannedFlow = async (flow: Flow) => {
    const confirmMsg = flow.type === "income"
      ? `Xác nhận thực hiện ngay khoản DỰ THU "${flow.title}" (+${flow.amount.toLocaleString("vi-VN")} ₫) vào thực tế?`
      : `Xác nhận thực hiện ngay khoản DỰ CHI "${flow.title}" (-${flow.amount.toLocaleString("vi-VN")} ₫) vào thực tế?`;

    if (!confirm(confirmMsg)) return;

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/flows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: flow.id,
          isActual: true,
          flowDate: todayStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        playCashCounterSound(1.5);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi thực hiện kế hoạch: " + err.message);
    }
  };

  // Xóa Flow và hoàn lại số dư kho tương ứng
  const handleDeleteFlowConfirm = async () => {
    if (!flowToDelete) return;
    try {
      const res = await fetch(`/api/flows?id=${encodeURIComponent(flowToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        // Đồng thời nếu flow này đang nằm trong plannedSelectedFlowIds thì loại ra
        if (systemSettings.plannedSelectedFlowIds?.includes(flowToDelete.id)) {
          handleSaveSystemSettings({
            ...systemSettings,
            plannedSelectedFlowIds: systemSettings.plannedSelectedFlowIds.filter((id) => id !== flowToDelete.id),
          });
        }
        setFlowToDelete(null);
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi xóa giao dịch: " + err.message);
    }
  };

  // Lưu chỉnh sửa số liệu cài đặt từ Modal Popup (Quy ước 1 = 1.000 VNĐ)
  const handleSaveSettingFromModal = () => {
    if (!settingEditModal.key) return;
    const units = parseFloat(settingEditModal.inputUnits);
    if (isNaN(units) || units < 0) {
      return alert("Vui lòng nhập số hợp lệ");
    }
    const realVal = Math.round(units * 1000);
    handleSaveSystemSettings({
      ...systemSettings,
      [settingEditModal.key]: realVal,
    });
    setSettingEditModal({
      isOpen: false,
      key: null,
      title: "",
      description: "",
      currentValue: 0,
      inputUnits: "",
    });
  };

  // Submit Đối Chiếu Số Dư Thực Tế (Mục 2.6)
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVaultForReconcile) return;
    const actual = parseFloat(reconcileForm.actualBalance);
    if (isNaN(actual) || actual < 0) {
      return alert("Vui lòng nhập số dư thực tế đếm được");
    }

    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId: selectedVaultForReconcile.id,
          actualBalance: actual,
          reason: reconcileForm.reason,
          assignAsFlow: reconcileForm.assignAsFlow,
          flowTag: reconcileForm.flowTag,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowReconcileModal(false);
        setSelectedVaultForReconcile(null);
        setReconcileForm({ actualBalance: "", reason: "Đối chiếu kiểm đếm định kỳ", assignAsFlow: false, flowTag: "Chênh lệch đối chiếu" });
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi đối chiếu: " + err.message);
    }
  };

  // CÔNG THỨC TÀI SẢN RÒNG (Nguyên tắc xuyên suốt toàn hệ sinh thái MoBo)
  // Tổng MoBo khả dụng (+), Tổng dư nợ ngân hàng (−), Tài sản ròng = Tổng MoBo (+) − Dư nợ (−)
  const positiveBalance = vaults.filter((v) => v.balance > 0).reduce((acc, v) => acc + v.balance, 0);
  const negativeDebt = Math.abs(vaults.filter((v) => v.balance < 0).reduce((acc, v) => acc + v.balance, 0));
  const totalBalance = vaults.reduce((acc, v) => acc + (v.balance || 0), 0);
  const netWorth = totalBalance;
  const totalReceivable = obligations
    .filter((o) => o.type === "receivable" || o.role === "creditor")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalPayable = negativeDebt;
  const totalTax = obligations
    .filter((o) => o.type === "tax")
    .reduce((acc, o) => acc + (o.amount || 0), 0);

  // Tính toán kiểm soát theo Ngưỡng Cài Đặt (Mục 7)
  // 1. Kiểm tra sự kiện dự chi/thu sắp diễn ra trong vòng X ngày (mặc định 3 ngày)
  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);
  const noticeHorizonDateObj = new Date(todayDateObj.getTime() + systemSettings.plannedAdvanceNoticeDays * 24 * 60 * 60 * 1000);
  
  const upcomingPlannedFlows = flows.filter((f) => {
    if (f.isActual) return false;
    if (!f.rawDate && !f.date) return false;
    // Chuẩn hóa rawDate hoặc date
    let fDate: Date | null = null;
    if (f.rawDate) {
      fDate = new Date(f.rawDate);
    } else if (f.date && f.date.includes("/")) {
      const parts = f.date.split("/");
      fDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (!fDate || isNaN(fDate.getTime())) return false;
    fDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((fDate.getTime() - todayDateObj.getTime()) / (24 * 60 * 60 * 1000));
    // Trong khoảng từ hôm nay đến X ngày nữa
    const isInNoticeWindow = diffDays >= 0 && diffDays <= systemSettings.plannedAdvanceNoticeDays;
    if (!isInNoticeWindow) return false;

    // Nếu chọn 'selective' (chọn theo sự kiện muốn thông báo)
    if (systemSettings.plannedNoticeScope === "selective") {
      return (systemSettings.plannedSelectedFlowIds || []).includes(f.id);
    }
    // Mặc định 'all' (tất cả sự kiện)
    return true;
  });

  // Toàn bộ các sự kiện dự chi / dự thu trong tương lai (để cấu hình gán thông báo)
  const allFuturePlannedFlows = flows.filter((f) => !f.isActual);

  // 2. Ngưỡng âm nợ cho phép
  const isDebtExceeded = negativeDebt > systemSettings.maxNegativeDebtAllowed;

  // 3. Ngưỡng tiền kho cho phép (cảnh báo kho nào có số dư dưới ngưỡng)
  const lowBalanceVaults = vaults.filter((v) => v.balance < systemSettings.minVaultBalanceAllowed);

  // 4. Mục tiêu tiết kiệm (Tính theo tổng tiền kho hoặc tài sản ròng)
  const savingsProgressPct = systemSettings.savingsGoalAmount > 0 
    ? Math.min(100, Math.round((positiveBalance / systemSettings.savingsGoalAmount) * 100))
    : 0;

  // Cảnh báo ưu tiên (Mục Trang chủ)
  const nearDueObligations = obligations.filter((o) => o.status === "urgent");
  const unverifiedReconciliations = reconciles.filter((r) => r.actionTaken.includes("chưa rõ"));
  const lockedTaxVault = vaults.find((v) => v.isLocked);
  const isTaxFundShort = (lockedTaxVault?.lockedAmount || 0) < totalTax;

  // Tính toán Mục 4: Định Giá & Hòa Vốn
  const totalCostPerUnit = pricingCalc.variableCost + (pricingCalc.expectedUnits > 0 ? pricingCalc.fixedCostAlloc / pricingCalc.expectedUnits : 0);
  // Định giá theo chi phí + margin: Giá = Chi phí / (1 - margin%)
  const priceByMargin = totalCostPerUnit / (1 - (pricingCalc.targetMarginPct / 100));
  // Định giá theo hòa vốn ngược (giá tối thiểu để hòa vốn với sản lượng kỳ vọng)
  const breakEvenPrice = totalCostPerUnit;
  // Sản lượng hòa vốn vận hành: Điểm hòa vốn Q = Chi phí cố định / (Giá bán - Chi phí biến đổi)
  const unitContribution = priceByMargin - pricingCalc.variableCost;
  const breakEvenUnits = unitContribution > 0 ? Math.ceil(pricingCalc.fixedCostAlloc / unitContribution) : 0;

  // Kiểm tra miss thời gian nhập báo cáo / chốt sổ hàng ngày
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayStr = now.toISOString().split("T")[0];
  const isMissedDailyReport =
    reminderConfig.enabled &&
    reminderConfig.mode === "daily" &&
    currentHHMM > reminderConfig.dailyTime &&
    reminderConfig.lastTriggeredDate !== todayStr;

  // Tổng hợp tất cả các thông báo hệ thống (Notification Center)
  interface SystemNotificationItem {
    id: string;
    type: "planned" | "debt" | "vault" | "missed_report" | "urgent_debt" | "reconcile" | "tax";
    title: string;
    desc: string;
    severity: "danger" | "warning" | "info";
    actionTab?: string;
    timestamp?: string;
  }

  const allSystemAlerts: SystemNotificationItem[] = [];

  // 1. Dự chi / Dự thu sắp đến hạn
  if (systemSettings.enablePlannedNotice) {
    upcomingPlannedFlows.forEach((f) => {
      allSystemAlerts.push({
        id: `planned_${f.id}`,
        type: "planned",
        title: f.type === "income" ? `Sắp đến ngày DỰ THU (+)` : `Sắp đến ngày DỰ CHI (-)`,
        desc: `${f.title} (${f.amount.toLocaleString("vi-VN")} ₫) vào ngày ${f.date || f.rawDate || "sắp tới"}`,
        severity: f.type === "income" ? "info" : "warning",
        actionTab: "home",
      });
    });
  }

  // 2. Vượt ngưỡng âm nợ cho phép
  if (isDebtExceeded) {
    allSystemAlerts.push({
      id: "debt_exceeded",
      type: "debt",
      title: "CẢNH BÁO: Vượt ngưỡng âm nợ an toàn!",
      desc: `Tổng dư nợ ngân hàng là ${negativeDebt.toLocaleString("vi-VN")} ₫ (vượt mức cho phép tối đa ${systemSettings.maxNegativeDebtAllowed.toLocaleString("vi-VN")} ₫)`,
      severity: "danger",
      actionTab: "home",
    });
  }

  // 3. Kho dưới ngưỡng tiền tối thiểu (hạn mức kho)
  lowBalanceVaults.forEach((v) => {
    allSystemAlerts.push({
      id: `vault_low_${v.id}`,
      type: "vault",
      title: `Hạn mức kho: Số dư kho "${v.name}" dưới mức an toàn!`,
      desc: `Số dư hiện tại ${v.balance.toLocaleString("vi-VN")} ₫ thấp hơn ngưỡng tối thiểu ${systemSettings.minVaultBalanceAllowed.toLocaleString("vi-VN")} ₫`,
      severity: "warning",
      actionTab: "home",
    });
  });

  // 4. Miss thời gian nhập báo cáo / chốt sổ
  if (isMissedDailyReport) {
    allSystemAlerts.push({
      id: "missed_daily_report",
      type: "missed_report",
      title: "Trễ hẹn: Chưa chốt sổ / kiểm tra tài chính hôm nay!",
      desc: `Khung giờ nhắc hẹn là ${reminderConfig.dailyTime} hàng ngày nhưng bạn chưa xác nhận kiểm đếm dòng tiền hôm nay`,
      severity: "danger",
      actionTab: "settings",
    });
  }

  // 5. Nợ khẩn cấp đến hạn
  nearDueObligations.forEach((o) => {
    allSystemAlerts.push({
      id: `urgent_debt_${o.id}`,
      type: "urgent_debt",
      title: `Khoản nợ khẩn cấp đến hạn: ${o.title}`,
      desc: `Khoản tiền ${o.amount.toLocaleString("vi-VN")} ₫ cần thanh toán vào ngày ${o.dueDate}`,
      severity: "danger",
      actionTab: "obligations",
    });
  });

  // 6. Chênh lệch đối chiếu chưa rõ nguyên nhân
  if (unverifiedReconciliations.length > 0) {
    allSystemAlerts.push({
      id: "unverified_reconcile",
      type: "reconcile",
      title: `Kỷ luật kiểm kê: Có ${unverifiedReconciliations.length} khoản chênh lệch chưa rõ nguyên nhân`,
      desc: "Cần rà soát đối chiếu lại dòng chảy để bảo vệ tính toàn vẹn kiểm toán",
      severity: "warning",
      actionTab: "settings",
    });
  }

  // 7. Quỹ dự phòng thuế bị thiếu hụt
  if (isTaxFundShort) {
    allSystemAlerts.push({
      id: "tax_fund_short",
      type: "tax",
      title: "Cảnh báo quỹ thuế: Quỹ thuế bị thiếu hụt",
      desc: `Số tiền khóa dự phòng (${lockedTaxVault?.lockedAmount || 0} ₫) thấp hơn ước tính nghĩa vụ thuế (${totalTax.toLocaleString("vi-VN")} ₫)`,
      severity: "warning",
      actionTab: "home",
    });
  }

  // Lọc thông báo chưa đọc & đánh dấu đã đọc
  const unreadAlerts = allSystemAlerts.filter((a) => !readAlertIds.includes(a.id));
  const unreadAlertsCount = unreadAlerts.length;

  const markAllAlertsAsRead = () => {
    const allIds = allSystemAlerts.map((a) => a.id);
    const updated = Array.from(new Set([...readAlertIds, ...allIds]));
    setReadAlertIds(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zmoney_read_alert_ids", JSON.stringify(updated));
      } catch (_) {}
    }
  };

  return (
    <div className="space-y-6 pb-32 sm:pb-36 relative">
      {/* THANH ĐIỀU HƯỚNG CHÍNH (Đã tinh gọn chỉ còn Trang Chủ & Cài Đặt) */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3 text-xs sm:text-sm font-black">
        <button
          onClick={() => setActiveTab("home")}
          className={`px-5 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "home" ? "bg-[#0C2C47] text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>🏠 Trang Chủ</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "settings" ? "bg-[#0C2C47] text-white shadow-md" : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Settings className="w-4 h-4 text-amber-300" />
          <span>⚙️ Cài Đặt Hệ Thống</span>
        </button>
      </div>

      {/* NỘI DUNG TRANG CHỦ (activeTab === "home"): 5 KHỐI ĐÚNG THỨ TỰ */}
      {activeTab === "home" && (
        <div className="space-y-7">
          {/* ======================================================== */}
          {/* KHỐI 1: TỔNG TÀI SẢN */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#0C2C47]">
                  <Scale className="w-5 h-5 text-[#BF512C]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Tổng Tài Sản Hệ Thống
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bao gồm toàn bộ MoBo khả dụng (+), dư nợ vay ngân hàng (−) và tài sản ròng
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                Toàn Hệ Thống
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Thẻ 1: Tổng MoBo khả dụng (+) */}
              <div className="bg-emerald-50/70 border-2 border-emerald-200/90 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                  1. Tổng MoBo Khả Dụng (+)
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1.5 block tracking-tight">
                  +{positiveBalance.toLocaleString("vi-VN")} ₫
                </span>
                <span className="text-xs text-emerald-700/90 mt-1 block font-medium">
                  {vaults.filter((v) => v.balance > 0).length} MoBo dương có thể luân chuyển ngay
                </span>
              </div>

              {/* Thẻ 2: Tổng Dư Nợ Ngân Hàng (−) */}
              <div className="bg-rose-50/70 border-2 border-rose-200/90 rounded-2xl p-4.5 shadow-2xs">
                <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                  2. Tổng Dư Nợ Vay Ngân Hàng (−)
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-600 mt-1.5 block tracking-tight">
                  {negativeDebt > 0 ? `-${negativeDebt.toLocaleString("vi-VN")} ₫` : "0 ₫"}
                </span>
                <span className="text-xs text-rose-700/90 mt-1 block font-medium">
                  {vaults.filter((v) => v.balance < 0).length} MoBo thấu chi / vay nợ ngân hàng
                </span>
              </div>

              {/* Thẻ 3: Tài Sản Ròng */}
              <div className="bg-slate-50 border-2 border-[#0C2C47]/20 rounded-2xl p-4.5 shadow-2xs bg-gradient-to-br from-slate-50 to-blue-50/40">
                <span className="text-[11px] font-black text-[#0C2C47] uppercase tracking-wider block">
                  3. Tài Sản Ròng Thực Có
                </span>
                <span className={`text-2xl sm:text-3xl font-black mt-1.5 block tracking-tight ${netWorth < 0 ? "text-rose-600" : "text-[#0C2C47]"}`}>
                  {netWorth < 0 ? `-${Math.abs(netWorth).toLocaleString("vi-VN")} ₫` : `${netWorth.toLocaleString("vi-VN")} ₫`}
                </span>
                <span className="text-xs text-slate-500 mt-1 block font-medium">
                  = Tiền khả dụng (+) trừ (-) Tổng dư nợ ngân hàng
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 2: CÁC MOBO (Money Box) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[#0C2C47]">
                  <Wallet className="w-5 h-5 text-[#0C2C47]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Các MoBo (Money Box) ({vaults.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hộp tiền mặt, tài khoản ngân hàng, ví điện tử & thẻ vay nợ thấu chi
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVaultModal(true)}
                className="bg-[#0C2C47] hover:bg-[#0C2C47]/90 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tạo MoBo Mới</span>
              </button>
            </div>

            {/* Danh sách các MoBo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {vaults.map((vault) => {
                const isNegative = vault.balance < 0;
                return (
                  <div
                    key={vault.id}
                    className={`p-4.5 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between ${
                      isNegative
                        ? "bg-rose-50/40 border-rose-300 ring-1 ring-rose-200"
                        : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-black text-slate-900 text-sm sm:text-base">{vault.name}</span>
                            {isNegative && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-300">
                                🔴 Vay nợ
                              </span>
                            )}
                            {vault.isLocked && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1">
                                <Lock className="w-3 h-3" />
                                <span>Khóa</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5 block truncate max-w-[200px]">
                            {vault.desc || "Không có ghi chú"}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {/* Sửa MoBo */}
                          <button
                            onClick={() => openEditVaultModal(vault)}
                            title="Sửa thông tin MoBo"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {/* Xóa MoBo */}
                          <button
                            onClick={() => openDeleteVaultModal(vault)}
                            title="Xóa MoBo (yêu cầu số dư 0đ hoặc kết chuyển)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-500">
                          {isNegative ? "Dư nợ ngân hàng:" : "Số dư khả dụng:"}
                        </span>
                        <span className={`text-lg font-black ${isNegative ? "text-rose-600" : "text-[#0C2C47]"}`}>
                          {isNegative
                            ? `-${Math.abs(vault.balance).toLocaleString("vi-VN")} ₫`
                            : `${vault.balance.toLocaleString("vi-VN")} ₫`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] mt-2">
                      <span className="text-slate-400 capitalize">
                        {vault.type === "bank"
                          ? "🏦 Ngân hàng"
                          : vault.type === "cash"
                          ? "💵 Tiền mặt"
                          : vault.type === "ewallet"
                          ? "📱 Ví điện tử"
                          : vault.type === "credit"
                          ? "💳 Thấu chi/Vay"
                          : vault.type}
                      </span>
                      <button
                        onClick={() => setSelectedVaultDetail(vault)}
                        className="text-slate-600 hover:text-[#0C2C47] font-bold text-[11px] cursor-pointer hover:underline"
                      >
                        Chi tiết ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* ======================================================== */}
          {/* KHU VỰC BOXCARD: CHỦ NỢ & CON NỢ (LOGIC VAY - MƯỢN) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
            {/* Header BoxCard */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Sổ Vay & Mượn (Chủ Nợ & Con Nợ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Theo dõi các khoản cho vay (chủ nợ) & đi vay (con nợ), lãi suất, thời hạn và xác nhận 2 phía
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateAgreement}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-1.5 transition active:scale-95"
                  title="Tạo văn bản thỏa thuận vay mượn có ID chia sẻ để 2 bên cùng ký điện tử"
                >
                  <PenTool className="w-4 h-4" />
                  <span>📝 Ký Thỏa Thuận (Chia Sẻ Link)</span>
                </button>
              </div>
            </div>

            {/* Thanh Tab Lọc Danh Sách */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLoanTabFilter("all")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    loanTabFilter === "all"
                      ? "bg-[#0C2C47] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({loans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanTabFilter("creditor")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1 ${
                    loanTabFilter === "creditor"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <span>🟢 Chủ Nợ ({loans.filter((l) => l.role === "creditor").length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoanTabFilter("debtor")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1 ${
                    loanTabFilter === "debtor"
                      ? "bg-rose-700 text-white shadow-xs"
                      : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                  }`}
                >
                  <span>🔴 Con Nợ ({loans.filter((l) => l.role === "debtor").length})</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                Quy ước nhập số: 1 = 1.000 VNĐ
              </span>
            </div>

            {/* Danh Sách Các Thẻ BoxCard Vay Mượn */}
            {(() => {
              const filteredLoans = loans.filter((l) => {
                if (loanTabFilter === "all") return true;
                return l.role === loanTabFilter;
              });

              if (filteredLoans.length === 0) {
                return (
                  <div className="text-center py-10 px-4 text-slate-500 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2.5">
                    <p className="font-medium text-slate-500">Chưa có khoản vay mượn nào trong danh mục này.</p>
                    <button
                      type="button"
                      onClick={handleOpenCreateAgreement}
                      className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tạo Thỏa Thuận & Ký Điện Tử 2 Bên ➔</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLoans.map((loan) => {
                    const isCreditor = loan.role === "creditor";
                    const isSettled = loan.status === "settled" || loan.remainingAmount <= 0;
                    const bothConfirmed = loan.confirmedCreditor && loan.confirmedDebtor;
                    const percentPaid = loan.amount > 0 ? Math.min(100, Math.round((loan.paidAmount / loan.amount) * 100)) : 0;

                    // Tính đếm ngược ngày đáo hạn
                    const getDueCountdown = (dueDateStr: string | null) => {
                      if (!dueDateStr) return null;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const due = new Date(dueDateStr);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, status: "overdue" };
                      } else if (diffDays === 0) {
                        return { text: "Hôm nay đáo hạn!", status: "today" };
                      } else if (diffDays <= 7) {
                        return { text: `Còn ${diffDays} ngày (sắp đến hạn)`, status: "warning" };
                      } else {
                        return { text: `Còn ${diffDays} ngày`, status: "normal" };
                      }
                    };
                    const dueCountdown = getDueCountdown(loan.dueDate);

                    // Bên A (Chủ Nợ - Bên Cho Vay)
                    const creditorName = loan.agreementCreditorName || (isCreditor ? "Tôi (Chủ Nợ)" : loan.partnerName);
                    const creditorContact = loan.agreementCreditorContact || (isCreditor && loan.vaultName ? `MoBo: ${loan.vaultName}` : "");

                    // Bên B (Con Nợ - Bên Đi Vay)
                    const debtorName = loan.agreementDebtorName || (!isCreditor ? "Tôi (Con Nợ)" : loan.partnerName);
                    const debtorContact = loan.agreementDebtorContact || (!isCreditor && loan.vaultName ? `MoBo: ${loan.vaultName}` : "");

                    // Ước tính tiền lãi theo kỳ
                    let estimatedInterestText = "";
                    if (loan.interestRate > 0 && loan.remainingAmount > 0) {
                      if (loan.interestType === "monthly") {
                        const est = Math.round((loan.remainingAmount * loan.interestRate) / 100);
                        estimatedInterestText = `~${est.toLocaleString("vi-VN")} ₫/tháng`;
                      } else if (loan.interestType === "yearly") {
                        const est = Math.round((loan.remainingAmount * loan.interestRate) / 100 / 12);
                        estimatedInterestText = `~${est.toLocaleString("vi-VN")} ₫/tháng`;
                      } else if (loan.interestType === "fixed_sum") {
                        estimatedInterestText = `${loan.interestRate.toLocaleString("vi-VN")} ₫ (cố định)`;
                      }
                    }

                    return (
                      <div
                        key={loan.id}
                        className={`rounded-2xl p-4 sm:p-5 border-2 transition-all space-y-3.5 ${
                          isSettled
                            ? "bg-slate-50/70 border-slate-200 opacity-80"
                            : isCreditor
                            ? "bg-gradient-to-br from-white via-white to-emerald-50/30 border-emerald-200 hover:border-emerald-400 shadow-xs"
                            : "bg-gradient-to-br from-white via-white to-rose-50/30 border-rose-200 hover:border-rose-400 shadow-xs"
                        }`}
                      >
                        {/* Hàng 1: Huy hiệu Vai Trò, Trạng thái & Link Thỏa Thuận */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                                isCreditor
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}
                            >
                              <span>{isCreditor ? "🟢 Tôi là Chủ Nợ (Cho Vay)" : "🔴 Tôi là Con Nợ (Đi Vay)"}</span>
                            </span>

                            {isSettled ? (
                              <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                ✓ Đã tất toán
                              </span>
                            ) : dueCountdown?.status === "overdue" ? (
                              <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full animate-pulse">
                                ⚠️ Quá hạn trả nợ
                              </span>
                            ) : (
                              <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                ⏳ Đang hiệu lực
                              </span>
                            )}
                          </div>

                          {loan.agreementId && (
                            <Link
                              href={`/agreement/${loan.agreementId}`}
                              target="_blank"
                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition shrink-0"
                              title="Xem văn bản thỏa thuận điện tử có 2 bản ký"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Thỏa thuận: #{loan.agreementId} ➔</span>
                            </Link>
                          )}
                        </div>

                        {/* Hàng 2: Tiêu đề khoản nợ */}
                        <div className="space-y-0.5">
                          <h4 className="font-black text-slate-900 text-base leading-snug">{loan.title}</h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Tạo: {loan.createdAt || loan.startDateFormatted || loan.startDate}</span>
                            </span>
                            {loan.agreementStatus && (
                              <span className="text-indigo-600 font-semibold bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                                {loan.agreementStatus === "completed" ? "✓ Ký hoàn tất 2 phía" : "⏳ Chờ ký điện tử"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hàng 3: Khối THÔNG TIN 2 BÊN (Chủ Nợ vs Con Nợ) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/90">
                          {/* Bên Cho Vay (Chủ Nợ) */}
                          <div className={`p-2.5 rounded-lg border transition ${isCreditor ? "bg-emerald-50/70 border-emerald-300" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center space-x-1">
                                <Building2 className="w-3 h-3 text-emerald-600" />
                                <span>Chủ Nợ (Bên Cho Vay)</span>
                              </span>
                              {isCreditor && (
                                <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                                  Tôi
                                </span>
                              )}
                            </div>
                            <div className="font-black text-slate-900 text-sm truncate" title={creditorName}>
                              {creditorName}
                            </div>
                            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                              {creditorContact && <span className="truncate">Liên hệ: {creditorContact}</span>}
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className="text-slate-400">Trạng thái:</span>
                                {loan.creditorSignedAt ? (
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] flex items-center space-x-0.5" title={`Ký lúc: ${loan.creditorSignedAt}`}>
                                    <CheckCircle2 className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>Đã ký ({loan.creditorSignedAt})</span>
                                  </span>
                                ) : loan.confirmedCreditor ? (
                                  <span className="font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
                                    ✓ Đã xác nhận chốt
                                  </span>
                                ) : (
                                  <span className="font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                                    ⏳ Chờ chốt xác nhận
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bên Vay (Con Nợ) */}
                          <div className={`p-2.5 rounded-lg border transition ${!isCreditor ? "bg-rose-50/70 border-rose-300" : "bg-white border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center space-x-1">
                                <Users className="w-3 h-3 text-rose-600" />
                                <span>Con Nợ (Bên Đi Vay)</span>
                              </span>
                              {!isCreditor && (
                                <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                                  Tôi
                                </span>
                              )}
                            </div>
                            <div className="font-black text-slate-900 text-sm truncate" title={debtorName}>
                              {debtorName}
                            </div>
                            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                              {debtorContact && <span className="truncate">Liên hệ: {debtorContact}</span>}
                              <div className="flex items-center space-x-1 mt-0.5">
                                <span className="text-slate-400">Trạng thái:</span>
                                {loan.debtorSignedAt ? (
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] flex items-center space-x-0.5" title={`Ký lúc: ${loan.debtorSignedAt}`}>
                                    <CheckCircle2 className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>Đã ký ({loan.debtorSignedAt})</span>
                                  </span>
                                ) : loan.confirmedDebtor ? (
                                  <span className="font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
                                    ✓ Đã xác nhận chốt
                                  </span>
                                ) : (
                                  <span className="font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                                    ⏳ Chờ chốt xác nhận
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hàng 4: Khối THÔNG TIN TÀI CHÍNH ĐI KÈM */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                          {/* Gốc - Đã trả - Dư nợ */}
                          <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-xs text-slate-500 font-medium">
                                Gốc ban đầu: <b className="text-slate-800">{loan.amount.toLocaleString("vi-VN")} ₫</b>
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Đã trả: <b className="text-slate-800">{loan.paidAmount.toLocaleString("vi-VN")} ₫</b> ({percentPaid}%)
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${isCreditor ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>

                            <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-100">
                              <span className="text-xs font-black text-slate-700">Dư nợ còn lại:</span>
                              <span className={`text-lg sm:text-xl font-black ${isCreditor ? "text-emerald-700" : "text-rose-700"}`}>
                                {loan.remainingAmount.toLocaleString("vi-VN")} ₫
                              </span>
                            </div>
                          </div>

                          {/* Lưới thông số tài chính đi kèm: Lãi suất, Kỳ hạn, Thời hạn, Đáo hạn */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                            {/* Ô Lãi Suất & Kỳ Trả Lãi */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                              <div className="flex items-center space-x-1 text-slate-500 text-[11px] font-bold">
                                <BadgePercent className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Lãi suất & Kỳ hạn trả lãi:</span>
                              </div>
                              <div className="font-black text-slate-900 text-xs">
                                {loan.interestType === "none" || loan.interestRate === 0
                                  ? "0% (Không tính lãi)"
                                  : `${loan.interestRate}% (${loan.interestType === "monthly" ? "/tháng" : loan.interestType === "yearly" ? "/năm" : "cố định"})`}
                              </div>
                              <div className="text-[10px] text-slate-600">
                                {loan.interestDueTerm === "monthly"
                                  ? "Trả lãi hàng tháng"
                                  : loan.interestDueTerm === "quarterly"
                                  ? "Trả lãi hàng quý"
                                  : loan.interestDueTerm === "end_term"
                                  ? "Trả lãi cuối kỳ cùng gốc"
                                  : "Theo thỏa thuận"}
                                {estimatedInterestText && (
                                  <span className="block text-indigo-700 font-bold mt-0.5">
                                    Ước tính lãi: {estimatedInterestText}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ô Thời Hạn & Đáo Hạn */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                              <div className="flex items-center space-x-1 text-slate-500 text-[11px] font-bold">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                <span>Thời gian & Đáo hạn:</span>
                              </div>
                              <div className="text-[11px] text-slate-700">
                                Bắt đầu: <b className="text-slate-900">{loan.startDateFormatted || loan.startDate}</b>
                              </div>
                              <div className="text-[11px] text-slate-700">
                                Đáo hạn: <b className="text-slate-900">{loan.dueDateFormatted || loan.dueDate || "Chưa hẹn ngày"}</b>
                              </div>
                              {dueCountdown && !isSettled && (
                                <span
                                  className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    dueCountdown.status === "overdue"
                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                      : dueCountdown.status === "today"
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : dueCountdown.status === "warning"
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {dueCountdown.text}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hũ MoBo liên kết & Ghi chú */}
                          <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center space-x-1.5">
                              <Wallet className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-slate-500 text-[11px]">MoBo liên kết:</span>
                              <b className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                                {loan.vaultName || "Chưa gán MoBo"}
                              </b>
                            </div>

                            {loan.notes && (
                              <span className="text-[10px] text-slate-500 italic max-w-xs truncate" title={loan.notes}>
                                Ghi chú: {loan.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hàng 5: Nút Xác Nhận 2 Phía */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-bold text-slate-500">Xác nhận:</span>
                            
                            {/* Phía Chủ Nợ */}
                            <button
                              type="button"
                              onClick={() => handleToggleLoanConfirm(loan, "creditor")}
                              title="Bấm để chuyển trạng thái xác nhận phía Chủ Nợ"
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer flex items-center space-x-1 ${
                                loan.confirmedCreditor
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              <span>Chủ nợ: {loan.confirmedCreditor ? "✓ Đã chốt" : "⏳ Chờ chốt"}</span>
                            </button>

                            {/* Phía Con Nợ */}
                            <button
                              type="button"
                              onClick={() => handleToggleLoanConfirm(loan, "debtor")}
                              title="Bấm để chuyển trạng thái xác nhận phía Con Nợ"
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer flex items-center space-x-1 ${
                                loan.confirmedDebtor
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              <span>Con nợ: {loan.confirmedDebtor ? "✓ Đã chốt" : "⏳ Chờ chốt"}</span>
                            </button>
                          </div>

                          {bothConfirmed ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã xác nhận 2 phía</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLoanConfirm(loan, undefined, true)}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                            >
                              Xác nhận cả 2 bên ➔
                            </button>
                          )}
                        </div>

                        {/* Hàng 6: Nút hành động */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          {!isSettled ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayLoan(loan)}
                              className={`px-3.5 py-1.5 rounded-xl text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1 ${
                                isCreditor
                                  ? "bg-emerald-700 hover:bg-emerald-800"
                                  : "bg-rose-700 hover:bg-rose-800"
                              }`}
                            >
                              <span>{isCreditor ? "✓ Thu Hồi Nợ" : "✓ Thanh Toán Trả Nợ"}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold italic">
                              Khoản nợ đã tất toán 100%
                            </span>
                          )}

                          <div className="flex items-center space-x-1">
                            {loan.agreementId && (
                              <Link
                                href={`/agreement/${loan.agreementId}`}
                                target="_blank"
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Xem văn bản thỏa thuận ký điện tử & 2 bản lưu"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditLoan(loan)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Sửa khoản nợ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setLoanToDelete(loan)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa khoản nợ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ======================================================== */}
          {/* KHỐI 3: XEM CHI TIẾT THU CHI LỌC THEO THỜI GIAN */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-[#0C2C47]">
                  <ArrowRightLeft className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Chi Tiết Thu Chi (Lọc Theo Thời Gian)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Theo dõi biến động dòng tiền thực tế, chỉnh sửa và xóa giao dịch quy ước 1=1.000 VNĐ
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowQuickIncomeModal(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  + Thu
                </button>
                <button
                  onClick={() => setShowQuickExpenseModal(true)}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  - Chi
                </button>
              </div>
            </div>

            {/* BỘ LỌC ĐA NĂNG */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
              {/* Nút lọc thời gian nhanh */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="text-[11px] text-slate-400 uppercase mr-1">Thời gian:</span>
                {[
                  { key: "all", label: "Tất cả" },
                  { key: "today", label: "Hôm nay" },
                  { key: "7days", label: "7 ngày qua" },
                  { key: "month", label: "Tháng này" },
                  { key: "custom", label: "Tùy chọn ngày" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setHomeFilterRange(item.key as any)}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                      homeFilterRange === item.key
                        ? "bg-[#0C2C47] text-white font-black shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Hàng chọn ngày tùy chọn & dropdown MoBo, Nhãn, Loại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {homeFilterRange === "custom" && (
                  <div className="col-span-1 sm:col-span-2 flex items-center space-x-2">
                    <input
                      type="date"
                      value={homeFilterStartDate}
                      onChange={(e) => setHomeFilterStartDate(e.target.value)}
                      className="p-2 rounded-xl border border-slate-300 bg-white w-full text-xs"
                      placeholder="Từ ngày"
                    />
                    <span className="text-slate-400">➔</span>
                    <input
                      type="date"
                      value={homeFilterEndDate}
                      onChange={(e) => setHomeFilterEndDate(e.target.value)}
                      className="p-2 rounded-xl border border-slate-300 bg-white w-full text-xs"
                      placeholder="Đến ngày"
                    />
                  </div>
                )}

                {/* Lọc theo loại */}
                <select
                  value={homeFilterType}
                  onChange={(e) => setHomeFilterType(e.target.value as any)}
                  className="p-2 rounded-xl border border-slate-300 bg-white text-xs"
                >
                  <option value="all">Tất cả loại (+ / -)</option>
                  <option value="income">Thu tiền vào (+)</option>
                  <option value="expense">Chi tiền ra (-)</option>
                  <option value="transfer">Chuyển nội bộ (➔)</option>
                </select>

                {/* Lọc theo MoBo */}
                <select
                  value={homeFilterVault}
                  onChange={(e) => setHomeFilterVault(e.target.value)}
                  className="p-2 rounded-xl border border-slate-300 bg-white text-xs"
                >
                  <option value="">Tất cả MoBo</option>
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>

                {/* Lọc theo Nhãn */}
                <select
                  value={homeFilterTag}
                  onChange={(e) => setHomeFilterTag(e.target.value)}
                  className="p-2 rounded-xl border border-slate-300 bg-white text-xs"
                >
                  <option value="">Tất cả Nhãn</option>
                  <option value="Doanh thu">Doanh thu</option>
                  <option value="Chi phí">Chi phí</option>
                  <option value="Nội bộ">Nội bộ</option>
                  <option value="Vận hành">Vận hành</option>
                  <option value="Thu nợ">Thu nợ</option>
                  <option value="Trả nợ">Trả nợ</option>
                  <option value="Chênh lệch">Chênh lệch</option>
                </select>
              </div>
            </div>

            {/* DANH SÁCH GIAO DỊCH SAU KHI LỌC */}
            {(() => {
              const actualFlows = flows.filter((f) => f.isActual);
              const todayYMD = new Date().toISOString().split("T")[0];
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
              const curMonthYMD = todayYMD.substring(0, 7); // YYYY-MM

              const filteredFlows = actualFlows.filter((flow) => {
                // Lọc theo loại
                if (homeFilterType !== "all" && flow.type !== homeFilterType) return false;
                // Lọc theo MoBo
                if (homeFilterVault && flow.fromVaultId !== homeFilterVault && flow.toVaultId !== homeFilterVault) return false;
                // Lọc theo Nhãn
                if (homeFilterTag && flow.tag !== homeFilterTag) return false;

                // Chuẩn hóa ngày flow
                const flowYMD = flow.rawDate ? String(flow.rawDate).split("T")[0] : "";
                if (homeFilterRange === "today") {
                  if (flowYMD && flowYMD !== todayYMD) return false;
                } else if (homeFilterRange === "7days") {
                  if (flowYMD && flowYMD < sevenDaysAgo) return false;
                } else if (homeFilterRange === "month") {
                  if (flowYMD && !flowYMD.startsWith(curMonthYMD)) return false;
                } else if (homeFilterRange === "custom") {
                  if (homeFilterStartDate && flowYMD && flowYMD < homeFilterStartDate) return false;
                  if (homeFilterEndDate && flowYMD && flowYMD > homeFilterEndDate) return false;
                }
                return true;
              });

              const totalFilteredIncome = filteredFlows
                .filter((f) => f.type === "income")
                .reduce((sum, f) => sum + f.amount, 0);
              const totalFilteredExpense = filteredFlows
                .filter((f) => f.type === "expense")
                .reduce((sum, f) => sum + f.amount, 0);

              return (
                <div className="space-y-3">
                  {/* Thống kê nhanh kết quả lọc */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium">
                      Tìm thấy <b className="text-slate-900">{filteredFlows.length}</b> giao dịch
                    </span>
                    <div className="flex items-center space-x-3 font-bold">
                      <span className="text-emerald-700">+{totalFilteredIncome.toLocaleString("vi-VN")} ₫</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-700">-{totalFilteredExpense.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  </div>

                  {filteredFlows.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Không có giao dịch nào phù hợp với điều kiện lọc thời gian đã chọn
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {filteredFlows.map((flow) => (
                        <div key={flow.id} className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{flow.title}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                {flow.tag}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                              <span>{flow.from} ➔ {flow.to}</span>
                              <span>•</span>
                              <span>{flow.date || flow.rawDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2.5">
                            <span
                              className={`text-sm font-black ${
                                flow.type === "income"
                                  ? "text-emerald-600"
                                  : flow.type === "expense"
                                  ? "text-rose-600"
                                  : "text-slate-800"
                              }`}
                            >
                              {flow.type === "income" ? "+" : flow.type === "expense" ? "-" : ""}
                              {flow.amount.toLocaleString("vi-VN")} ₫
                            </span>

                            {/* Nút Sửa & Xóa giao dịch */}
                            <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditFlow(flow)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Sửa số liệu (1=1k)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setFlowToDelete(flow)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Xóa giao dịch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ======================================================== */}
          {/* KHỐI 4: TRẠNG THÁI NGƯỠNG */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Trạng Thái Ngưỡng Kiểm Soát An Toàn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ngưỡng âm nợ tối đa, ngưỡng tiền tối thiểu MoBo và tiến độ mục tiêu tiết kiệm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("settings")}
                className="text-xs text-blue-700 font-bold hover:underline cursor-pointer"
              >
                Cài đặt ngưỡng ➔
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chỉ báo 1: Ngưỡng âm nợ cho phép */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Ngưỡng âm nợ cho phép</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingEditModal({
                        isOpen: true,
                        key: "maxNegativeDebtAllowed",
                        title: "Chỉnh Sửa Ngưỡng Âm Nợ Cho Phép",
                        description: "Hệ thống cảnh báo đỏ khi tổng dư nợ vượt ngưỡng",
                        currentValue: systemSettings.maxNegativeDebtAllowed,
                        inputUnits: (systemSettings.maxNegativeDebtAllowed / 1000).toString(),
                      })
                    }
                    className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900">
                    {negativeDebt.toLocaleString("vi-VN")} ₫
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    / Tối đa {systemSettings.maxNegativeDebtAllowed.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="pt-1">
                  {isDebtExceeded ? (
                    <span className="text-[11px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300 inline-block">
                      ⚠️ Đang vượt hạn mức nợ!
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                      ✓ Nợ trong hạn mức an toàn
                    </span>
                  )}
                </div>
              </div>

              {/* Chỉ báo 2: Ngưỡng số dư tối thiểu mỗi MoBo */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Ngưỡng MoBo tối thiểu</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingEditModal({
                        isOpen: true,
                        key: "minVaultBalanceAllowed",
                        title: "Chỉnh Sửa Ngưỡng Tiền Tối Thiểu Mỗi MoBo",
                        description: "Cảnh báo khi MoBo có số dư dưới ngưỡng này",
                        currentValue: systemSettings.minVaultBalanceAllowed,
                        inputUnits: (systemSettings.minVaultBalanceAllowed / 1000).toString(),
                      })
                    }
                    className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900">
                    {systemSettings.minVaultBalanceAllowed.toLocaleString("vi-VN")} ₫
                  </span>
                  <span className="text-xs text-slate-500 font-medium">ngưỡng an toàn</span>
                </div>
                <div className="pt-1">
                  {lowBalanceVaults.length > 0 ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                      ⚠️ {lowBalanceVaults.length} MoBo dưới ngưỡng
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                      ✓ Tất cả MoBo đều đạt chuẩn
                    </span>
                  )}
                </div>
              </div>

              {/* Chỉ báo 3: Mục tiêu tiết kiệm */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Mục tiêu tích lũy</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingEditModal({
                        isOpen: true,
                        key: "savingsGoalAmount",
                        title: "Chỉnh Sửa Mục Tiêu Tiết Kiệm Tích Lũy",
                        description: "Theo dõi tỷ lệ hoàn thành mục tiêu",
                        currentValue: systemSettings.savingsGoalAmount,
                        inputUnits: (systemSettings.savingsGoalAmount / 1000).toString(),
                      })
                    }
                    className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-emerald-700">{savingsProgressPct}%</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {positiveBalance.toLocaleString("vi-VN")} ₫ / {systemSettings.savingsGoalAmount.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${savingsProgressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 5: KẾ HOẠCH SẮP TỚI (DỰ THU / DỰ CHI) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    Kế Hoạch Sắp Tới (Dự Thu / Dự Chi)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Các sự kiện tài chính tương lai, đếm ngược ngày đến hạn và nút thực hiện ngay
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {allFuturePlannedFlows.length} Kế Hoạch
              </span>
            </div>

            {allFuturePlannedFlows.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Chưa có kế hoạch dự thu hay dự chi nào trong tương lai. Bạn có thể thêm khi ghi Thu hoặc Chi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {allFuturePlannedFlows.map((plan) => {
                  // Tính khoảng cách ngày
                  let diffDaysText = "";
                  if (plan.rawDate || plan.date) {
                    const today0 = new Date();
                    today0.setHours(0, 0, 0, 0);
                    let pDate: Date | null = null;
                    if (plan.rawDate) {
                      pDate = new Date(plan.rawDate);
                    } else if (plan.date && plan.date.includes("/")) {
                      const p = plan.date.split("/");
                      pDate = new Date(`${p[2]}-${p[1]}-${p[0]}`);
                    }
                    if (pDate && !isNaN(pDate.getTime())) {
                      pDate.setHours(0, 0, 0, 0);
                      const diff = Math.ceil((pDate.getTime() - today0.getTime()) / (24 * 60 * 60 * 1000));
                      if (diff === 0) diffDaysText = "Hôm nay đến hạn";
                      else if (diff > 0) diffDaysText = `Còn ${diff} ngày nữa`;
                      else diffDaysText = `Quá hạn ${Math.abs(diff)} ngày`;
                    }
                  }

                  return (
                    <div
                      key={plan.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                plan.type === "income"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {plan.type === "income" ? "DỰ THU (+)" : "DỰ CHI (-)"}
                            </span>
                            <span className="font-bold text-slate-900 text-sm">{plan.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {plan.from} ➔ {plan.to} • Ngày: <b className="text-slate-700">{plan.date || plan.rawDate}</b>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-slate-900 block">
                            {plan.amount.toLocaleString("vi-VN")} ₫
                          </span>
                          {diffDaysText && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full inline-block mt-0.5">
                              ⏳ {diffDaysText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Các nút hành động: Thực hiện ngay, Sửa, Xóa */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditFlow(plan)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                            title="Sửa kế hoạch (1=1k)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFlowToDelete(plan)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                            title="Xóa kế hoạch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExecutePlannedFlow(plan)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0C2C47] hover:bg-[#0C2C47]/90 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center space-x-1"
                        >
                          <span>✓ Thực hiện ngay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB 9: MỤC 7. CÀI ĐẶT HỆ THỐNG */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">Cài Đặt Hệ Thống & Cảnh Báo</h3>
            <p className="text-xs text-slate-300">
              Cấu hình ngưỡng số ngày im lặng của Kho, quy tắc đối chiếu định kỳ và danh mục nhãn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 7.3 THÔNG BÁO SỰ KIỆN DỰ CHI & DỰ THU TRƯỚC X NGÀY */}
            <div className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-amber-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C2C47] text-sm">Thông Báo Sự Kiện Dự Chi / Thu</h4>
                    <p className="text-[11px] text-slate-500">Nhắc nhở người dùng còn X ngày đến ngày thực hiện</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.enablePlannedNotice}
                    onChange={(e) =>
                      handleSaveSystemSettings({
                        ...systemSettings,
                        enablePlannedNotice: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div>
                    <span className="font-bold text-amber-950 block">Nhắc trước số ngày:</span>
                    <span className="text-[11px] text-amber-800">
                      Ví dụ: Dự chi ngày 8/10, trước 3 ngày hệ thống sẽ phát cảnh báo
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 5, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          handleSaveSystemSettings({
                            ...systemSettings,
                            plannedAdvanceNoticeDays: d,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-black transition cursor-pointer ${
                          systemSettings.plannedAdvanceNoticeDays === d
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {d} ngày
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bộ chọn phạm vi: Tất cả sự kiện vs Chọn theo sự kiện */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Phạm vi gán thông báo:</span>
                      <span className="text-[11px] text-slate-500">
                        {systemSettings.plannedNoticeScope === "all"
                          ? "Tất cả các khoản dự thu/chi đến hạn đều được thông báo"
                          : "Chỉ thông báo những sự kiện dự thu/chi được bạn tick chọn bên dưới"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveSystemSettings({
                            ...systemSettings,
                            plannedNoticeScope: "all",
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          systemSettings.plannedNoticeScope === "all"
                            ? "bg-[#0C2C47] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        ✓ Tất cả sự kiện
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveSystemSettings({
                            ...systemSettings,
                            plannedNoticeScope: "selective",
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          systemSettings.plannedNoticeScope === "selective"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        📌 Chọn theo sự kiện
                      </button>
                    </div>
                  </div>

                  {/* Khi chọn 'selective': Danh sách tick chọn các sự kiện dự chi/dự thu */}
                  {systemSettings.plannedNoticeScope === "selective" && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase">
                          Danh sách gán thông báo ({systemSettings.plannedSelectedFlowIds?.length || 0} đã chọn):
                        </span>
                        <div className="flex space-x-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveSystemSettings({
                                ...systemSettings,
                                plannedSelectedFlowIds: allFuturePlannedFlows.map((f) => f.id),
                              })
                            }
                            className="text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            Chọn tất cả
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveSystemSettings({
                                ...systemSettings,
                                plannedSelectedFlowIds: [],
                              })
                            }
                            className="text-slate-500 hover:underline font-semibold cursor-pointer"
                          >
                            Bỏ chọn hết
                          </button>
                        </div>
                      </div>

                      {allFuturePlannedFlows.length > 0 ? (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {allFuturePlannedFlows.map((f) => {
                            const isSelected = (systemSettings.plannedSelectedFlowIds || []).includes(f.id);
                            return (
                              <label
                                key={f.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer text-xs ${
                                  isSelected
                                    ? "bg-amber-50/80 border-amber-300"
                                    : "bg-white border-slate-200 opacity-70 hover:opacity-100"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const currentIds = systemSettings.plannedSelectedFlowIds || [];
                                      const newIds = e.target.checked
                                        ? [...currentIds, f.id]
                                        : currentIds.filter((id) => id !== f.id);
                                      handleSaveSystemSettings({
                                        ...systemSettings,
                                        plannedSelectedFlowIds: newIds,
                                      });
                                    }}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          f.type === "income"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-rose-100 text-rose-800"
                                        }`}
                                      >
                                        {f.type === "income" ? "DỰ THU" : "DỰ CHI"}
                                      </span>
                                      <span className="font-bold text-slate-800">{f.title}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                      Ngày: {f.date || f.rawDate || "Chưa rõ"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    <span className="font-black text-slate-900 block">
                                      {f.amount.toLocaleString("vi-VN")} ₫
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold ${
                                        isSelected ? "text-amber-700" : "text-slate-400"
                                      }`}
                                    >
                                      {isSelected ? "🔔 Nhận thông báo" : "Tắt nhắc"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1 pl-1 border-l border-slate-200">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleOpenEditFlow(f);
                                      }}
                                      className="p-1 rounded hover:bg-white text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                      title="Sửa số liệu"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setFlowToDelete(f);
                                      }}
                                      className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                      title="Xóa kế hoạch"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-500 text-[11px]">
                          Chưa có khoản dự chi hoặc dự thu nào được tạo.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {upcomingPlannedFlows.length > 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">
                      Các sự kiện sắp đến hạn trong {systemSettings.plannedAdvanceNoticeDays} ngày tới ({upcomingPlannedFlows.length}):
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {upcomingPlannedFlows.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              f.type === "income" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                              {f.type === "income" ? "DỰ THU" : "DỰ CHI"}
                            </span>
                            <span className="font-bold text-slate-800 truncate max-w-[160px]">{f.title}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <span className="font-black text-slate-900 block">{f.amount.toLocaleString("vi-VN")} ₫</span>
                              <span className="text-[10px] text-amber-700 font-semibold">{f.date || f.rawDate}</span>
                            </div>
                            <div className="flex items-center space-x-1 pl-1 border-l border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditFlow(f)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                title="Sửa số liệu"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setFlowToDelete(f)}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Xóa kế hoạch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center text-slate-500 text-[11px]">
                    ✓ Không có sự kiện dự chi/thu nào trong {systemSettings.plannedAdvanceNoticeDays} ngày tới
                  </div>
                )}
              </div>
            </div>

            {/* 7.4 NGƯỠNG ÂM NỢ CHO PHÉP & NGƯỠNG TIỀN KHO */}
            <div className="bg-white p-5 rounded-2xl border border-[#ABCBCA] shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b pb-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[#0C2C47] text-sm">Ngưỡng Âm Nợ & Tiền Kho Cho Phép</h4>
                  <p className="text-[11px] text-slate-500">Thiết lập các giới hạn bảo vệ an toàn vốn</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Ngưỡng âm nợ */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Ngưỡng âm nợ cho phép tối đa:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-rose-700 text-sm">
                        {systemSettings.maxNegativeDebtAllowed.toLocaleString("vi-VN")} ₫
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingEditModal({
                            isOpen: true,
                            key: "maxNegativeDebtAllowed",
                            title: "Chỉnh Sửa Ngưỡng Âm Nợ Cho Phép Tối Đa",
                            description: "Hệ thống sẽ phát cảnh báo đỏ khi tổng nợ phải trả vượt quá ngưỡng này",
                            currentValue: systemSettings.maxNegativeDebtAllowed,
                            inputUnits: (systemSettings.maxNegativeDebtAllowed / 1000).toString(),
                          })
                        }
                        className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                        title="Tùy chỉnh số liệu"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[20000000, 50000000, 100000000, 200000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          handleSaveSystemSettings({
                            ...systemSettings,
                            maxNegativeDebtAllowed: val,
                          })
                        }
                        className={`py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          systemSettings.maxNegativeDebtAllowed === val
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {val >= 1000000000 ? `${val / 1000000000} Tỷ` : `${val / 1000000} Tr`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Hiện tại nợ phải trả: <b className="text-slate-800">{totalPayable.toLocaleString("vi-VN")} ₫</b>
                    {isDebtExceeded ? (
                      <span className="text-rose-600 font-bold ml-1">⚠️ Đang vượt ngưỡng!</span>
                    ) : (
                      <span className="text-emerald-600 font-bold ml-1">✓ Đang trong mức an toàn</span>
                    )}
                  </p>
                </div>

                {/* Ngưỡng tiền kho tối thiểu */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Ngưỡng số dư tối thiểu mỗi kho:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-[#0C2C47] text-sm">
                        {systemSettings.minVaultBalanceAllowed.toLocaleString("vi-VN")} ₫
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingEditModal({
                            isOpen: true,
                            key: "minVaultBalanceAllowed",
                            title: "Chỉnh Sửa Ngưỡng Số Dư Tối Thiểu Mỗi Kho",
                            description: "Hệ thống cảnh báo khi có bất kỳ kho nào rơi xuống dưới ngưỡng này",
                            currentValue: systemSettings.minVaultBalanceAllowed,
                            inputUnits: (systemSettings.minVaultBalanceAllowed / 1000).toString(),
                          })
                        }
                        className="p-1 rounded-lg hover:bg-slate-200 text-[#0C2C47] transition cursor-pointer"
                        title="Tùy chỉnh số liệu"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[1000000, 2000000, 5000000, 10000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          handleSaveSystemSettings({
                            ...systemSettings,
                            minVaultBalanceAllowed: val,
                          })
                        }
                        className={`py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          systemSettings.minVaultBalanceAllowed === val
                            ? "bg-[#0C2C47] text-white border-[#0C2C47]"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {val / 1000000} Tr
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Kho dưới ngưỡng: <b className={lowBalanceVaults.length > 0 ? "text-amber-600" : "text-emerald-600"}>
                      {lowBalanceVaults.length > 0 ? `${lowBalanceVaults.length} kho cần nạp thêm` : "Tất cả kho an toàn"}
                    </b>
                  </p>
                </div>
              </div>
            </div>

            {/* 7.5 MỤC TIÊU TIẾT KIỆM TÍCH LŨY */}
            <div className="md:col-span-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#0C2C47] text-base">Mục Tiêu Tiết Kiệm & Quỹ Tích Lũy</h4>
                    <p className="text-[11px] text-slate-500">Kế hoạch tài chính dài hạn hướng tới tự do tài chính</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tiến độ đạt được</span>
                    <span className="text-lg font-black text-emerald-700">{savingsProgressPct}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingEditModal({
                        isOpen: true,
                        key: "savingsGoalAmount",
                        title: "Chỉnh Sửa Mục Tiêu Tiết Kiệm & Quỹ Tích Lũy",
                        description: "Kế hoạch tài chính dài hạn để theo dõi tiến độ tỷ lệ hoàn thành",
                        currentValue: systemSettings.savingsGoalAmount,
                        inputUnits: (systemSettings.savingsGoalAmount / 1000).toString(),
                      })
                    }
                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer flex items-center space-x-1 text-xs font-bold shadow-xs"
                    title="Nhập mục tiêu tùy ý"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sửa số liệu</span>
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${savingsProgressPct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Hiện có: <b>{totalBalance.toLocaleString("vi-VN")} ₫</b></span>
                  <span>Mục tiêu: <b>{systemSettings.savingsGoalAmount.toLocaleString("vi-VN")} ₫</b></span>
                </div>
              </div>

              {/* Chọn mức mục tiêu nhanh */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                {[50000000, 100000000, 200000000, 500000000].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      handleSaveSystemSettings({
                        ...systemSettings,
                        savingsGoalAmount: goal,
                      })
                    }
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      systemSettings.savingsGoalAmount === goal
                        ? "border-emerald-600 bg-emerald-100/70 font-black text-emerald-900 ring-2 ring-emerald-400"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold"
                    }`}
                  >
                    <span className="text-xs block">{goal >= 1000000000 ? `${goal / 1000000000} Tỷ` : `${goal / 1000000} Triệu`} ₫</span>
                    <span className="text-[10px] text-slate-500">Mục tiêu</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 7.2A CÀI ĐẶT THỜI GIAN CHO CÁC HÀNH ĐỘNG CẬP NHẬT TÀI CHÍNH */}
            <div className="md:col-span-2 bg-gradient-to-b from-blue-50/50 to-white p-5 sm:p-6 rounded-2xl border-2 border-blue-200 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-blue-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0C2C47] text-white flex items-center justify-center shadow-md">
                    <Clock className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-[#0C2C47]">
                      Cài Đặt Thời Gian Cập Nhật Tài Chính
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Lên lịch hẹn giờ cho các hành động chốt sổ, kiểm kê kho & cập nhật dòng tiền
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                    {reminderConfig.enabled ? "Đang bật nhắc nhở" : "Tắt nhắc nhở"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderConfig.enabled}
                      onChange={(e) => handleSaveReminder({ ...reminderConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* LỰA CHỌN CHẾ ĐỘ HẸN GIỜ */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveReminder({ ...reminderConfig, mode: "daily" })}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      reminderConfig.mode === "daily"
                        ? "border-[#0C2C47] bg-blue-50/80 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#0C2C47]">⏰ CỐ ĐỊNH HÀNG NGÀY</span>
                      {reminderConfig.mode === "daily" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Cài đặt mốc giờ chốt sổ & đối chiếu kiểm kê định kỳ trong ngày.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = Date.now() + reminderConfig.countdownMinutes * 60 * 1000;
                      handleSaveReminder({ ...reminderConfig, mode: "countdown", countdownTarget: target });
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      reminderConfig.mode === "countdown"
                        ? "border-[#0C2C47] bg-blue-50/80 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#0C2C47]">⏳ ĐẾM NGƯỢC CHU KỲ</span>
                      {reminderConfig.mode === "countdown" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tự động báo nhắc kiểm đếm sau một khoảng thời gian linh hoạt (phút/giờ).
                    </p>
                  </button>
                </div>

                {reminderConfig.mode === "daily" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* KHUNG GIỜ CHỐT SỔ CUỐI NGÀY */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-black text-[#0C2C47] block">
                          1. Giờ Chốt Sổ & Xem Báo Cáo Cuối Ngày
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Nhắc kiểm tra dòng tiền & tài sản ròng hôm nay
                        </span>
                      </div>
                      <input
                        type="time"
                        value={reminderConfig.dailyTime}
                        onChange={(e) => handleSaveReminder({ ...reminderConfig, dailyTime: e.target.value })}
                        className="p-2 rounded-xl border border-slate-300 text-base font-black text-[#0C2C47] bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* KHUNG GIỜ ĐỐI CHIẾU KIỂM KÊ KHO */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-black text-[#0C2C47] block">
                          2. Giờ Đối Chiếu & Kiểm Kê Quỹ Kho
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Nhắc kiểm đếm tiền mặt, tài khoản ngân hàng, ví
                        </span>
                      </div>
                      <input
                        type="time"
                        value={reminderConfig.reconcileTime || "09:00"}
                        onChange={(e) => handleSaveReminder({ ...reminderConfig, reconcileTime: e.target.value })}
                        className="p-2 rounded-xl border border-slate-300 text-base font-black text-[#0C2C47] bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">Đếm ngược nhắc nhở tiếp theo:</span>
                      <span className="text-sm font-black text-[#BF512C]">
                        {countdownText || `${reminderConfig.countdownMinutes} phút`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-xs font-bold">
                      {[15, 30, 45, 60, 120, 180].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            const target = Date.now() + mins * 60 * 1000;
                            handleSaveReminder({
                              ...reminderConfig,
                              countdownMinutes: mins,
                              countdownTarget: target,
                            });
                          }}
                          className={`py-2 rounded-xl border transition cursor-pointer text-center ${
                            reminderConfig.countdownMinutes === mins
                              ? "bg-[#0C2C47] text-white border-[#0C2C47]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {mins < 60 ? `${mins} phút` : `${mins / 60} giờ`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7.2B CẤU HÌNH ÂM THANH THÔNG BÁO ĐẶC QUYỀN */}
            <div className="md:col-span-2 bg-gradient-to-b from-amber-50/50 to-white p-5 sm:p-6 rounded-2xl border-2 border-amber-300 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-amber-200 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-[#0C2C47]">
                        Cấu Hình Âm Thanh Thông Báo
                      </h4>
                      <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        3 Hồi Ngắt Quãng
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Mặc định kêu 3 lần ngắt quãng với âm thanh đặc quyền được chuẩn hóa cố định theo từng sự kiện
                    </p>
                  </div>
                </div>
              </div>

              {/* KHỐI ĐIỀU CHỈNH ÂM LƯỢNG */}
              <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {(reminderConfig.volume ?? 80) === 0 ? (
                      <VolumeX className="w-5 h-5 text-rose-500" />
                    ) : (reminderConfig.volume ?? 80) < 50 ? (
                      <Volume1 className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-emerald-600" />
                    )}
                    <span className="text-xs font-black text-[#0C2C47] uppercase">
                      Âm Lượng Chuông Thông Báo:
                    </span>
                    <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                      {reminderConfig.volume ?? 80}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs font-bold">
                    {[
                      { label: "Tắt", val: 0 },
                      { label: "30%", val: 30 },
                      { label: "50%", val: 50 },
                      { label: "80%", val: 80 },
                      { label: "100%", val: 100 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSaveReminder({ ...reminderConfig, volume: preset.val })}
                        className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          (reminderConfig.volume ?? 80) === preset.val
                            ? "bg-[#0C2C47] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs text-slate-400 font-bold">0%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reminderConfig.volume ?? 80}
                    onChange={(e) =>
                      handleSaveReminder({ ...reminderConfig, volume: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <span className="text-xs text-slate-400 font-bold">100%</span>
                </div>
              </div>

              {/* BẢNG 4 ÂM THANH SỰ KIỆN CỐ ĐỊNH & NGHE THỬ */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#0C2C47] uppercase tracking-wide">
                    Âm thanh chuẩn hóa theo sự kiện (Hệ thống gán cố định)
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Nghe thử âm lượng thực tế
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. SỰ KIỆN CẢNH BÁO */}
                  <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/40 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🚨</span>
                          <span className="text-xs font-black text-rose-950 uppercase">
                            Sự Kiện Cảnh Báo
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                          Chuông báo động
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                        Kích hoạt khi: Vượt ngưỡng âm nợ, kho dưới hạn mức, trễ hẹn chốt sổ, khoản nợ khẩn cấp.
                      </p>
                      <p className="text-[10px] text-rose-800 font-semibold mt-1">
                        🔊 Tiếng chuông cảnh báo dồn dập (3 hồi ngắt quãng)
                      </p>
                    </div>

                    <div className="pt-2 border-t border-rose-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          isPlayingSoundTest === "alert" ? handleStopSoundTest() : handleTestSound("alert")
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                          isPlayingSoundTest === "alert"
                            ? "bg-rose-600 text-white animate-pulse"
                            : "bg-white hover:bg-rose-100 text-rose-900 border border-rose-300"
                        }`}
                      >
                        {isPlayingSoundTest === "alert" ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-rose-900" />
                            <span>Nghe thử (3 hồi)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. SỰ KIỆN TIỀN THU */}
                  <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🪙</span>
                          <span className="text-xs font-black text-emerald-950 uppercase">
                            Sự Kiện Tiền Thu (+)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                          Tiền xu leng keng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                        Kích hoạt khi: Ghi nhận tiền thu vào kho thực tế, nhận tiền bán hàng, thu hồi nợ.
                      </p>
                      <p className="text-[10px] text-emerald-800 font-semibold mt-1">
                        🔊 Tiếng tiền leng keng đồng xu vàng bạc (3 hồi ngắt quãng)
                      </p>
                    </div>

                    <div className="pt-2 border-t border-emerald-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          isPlayingSoundTest === "income" ? handleStopSoundTest() : handleTestSound("income")
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                          isPlayingSoundTest === "income"
                            ? "bg-emerald-600 text-white animate-pulse"
                            : "bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {isPlayingSoundTest === "income" ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-emerald-900" />
                            <span>Nghe thử (3 hồi)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 3. SỰ KIỆN TIỀN CHI */}
                  <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/40 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">💵</span>
                          <span className="text-xs font-black text-amber-950 uppercase">
                            Sự Kiện Tiền Chi (-)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                          Máy đếm tiền
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                        Kích hoạt khi: Ghi nhận tiền chi ra khỏi kho, chi tiêu vận hành, trả nợ người bán.
                      </p>
                      <p className="text-[10px] text-amber-800 font-semibold mt-1">
                        🔊 Tiếng máy vuốt đếm tiền polyme tạch tạch (3 nhịp ngắt quãng)
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          isPlayingSoundTest === "expense" ? handleStopSoundTest() : handleTestSound("expense")
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                          isPlayingSoundTest === "expense"
                            ? "bg-amber-600 text-white animate-pulse"
                            : "bg-white hover:bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {isPlayingSoundTest === "expense" ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-amber-900" />
                            <span>Nghe thử (3 hồi)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4. SỰ KIỆN ĐẠT MỤC TIÊU */}
                  <div className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🏆</span>
                          <span className="text-xs font-black text-blue-950 uppercase">
                            Sự Kiện Đạt Mục Tiêu
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                          Chuông vinh quang
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                        Kích hoạt khi: Đạt mốc tiết kiệm tích lũy, cân đối tài chính an toàn, vượt qua điểm hòa vốn.
                      </p>
                      <p className="text-[10px] text-blue-800 font-semibold mt-1">
                        🔊 Hợp âm chiến thắng vinh quang rực rỡ Đô-Mi-Sol-Đố (3 hồi ngắt quãng)
                      </p>
                    </div>

                    <div className="pt-2 border-t border-blue-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          isPlayingSoundTest === "goal" ? handleStopSoundTest() : handleTestSound("goal")
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-2xs ${
                          isPlayingSoundTest === "goal"
                            ? "bg-blue-600 text-white animate-pulse"
                            : "bg-white hover:bg-blue-100 text-blue-900 border border-blue-300"
                        }`}
                      >
                        {isPlayingSoundTest === "goal" ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>Dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-blue-900" />
                            <span>Nghe thử (3 hồi)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR: 3 NÚT THU - CHUÔNG - CHI */}
      {!showQuickIncomeModal &&
        !showQuickExpenseModal &&
        !showQuickRecordModal &&
        !showVaultModal &&
        !showReconcileModal &&
        !selectedVaultDetail &&
        !showReminderModal &&
        !showAlarmAlertModal &&
        !showNotificationCenterModal &&
        !editingFlow &&
        !flowToDelete &&
        !settingEditModal.isOpen && (
          <nav
            aria-label="Thanh điều hướng đáy màn hình - Thu, Chuông thông báo, Chi"
            className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-3 py-2 sm:py-2.5 select-none"
            style={{ isolation: "isolate" }}
          >
            <div className="max-w-lg mx-auto grid grid-cols-3 gap-2 sm:gap-3.5 items-center">
              {/* 1. NÚT THU: XANH ĐẬM CHỐNG PHẢN QUANG */}
              <button
                type="button"
                onClick={() => {
                  if (!quickIncomeForm.toVaultId && vaults.length > 0) {
                    setQuickIncomeForm((prev) => ({ ...prev, toVaultId: vaults[0].id }));
                  }
                  setShowQuickIncomeModal(true);
                }}
                style={{ backgroundColor: "#0e6b38", color: "#ffffff", borderColor: "#16a34a" }}
                className="group h-13 sm:h-15 rounded-2xl border-2 shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer hover:brightness-105"
                title="Ghi nhận khoản THU tiền vào"
              >
                <div className="p-1 rounded-full bg-black/25 shrink-0">
                  <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[3]" />
                </div>
                <div className="text-left leading-none">
                  <span className="block font-black text-sm sm:text-base tracking-wider text-white">THU</span>
                  <span className="block text-[8px] sm:text-[9px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">(+) VÀO</span>
                </div>
              </button>

              {/* 2. NÚT CHUÔNG THÔNG BÁO Ở GIỮA */}
              <button
                type="button"
                onClick={() => {
                  markAllAlertsAsRead();
                  setShowNotificationCenterModal(true);
                }}
                style={{
                  backgroundColor: unreadAlertsCount > 0 ? "#b45309" : "#0C2C47",
                  color: "#ffffff",
                  borderColor: unreadAlertsCount > 0 ? "#f59e0b" : "#1e3a5f",
                }}
                className="relative group h-13 sm:h-15 rounded-2xl border-2 shadow-md shadow-black/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer hover:brightness-105"
                title="Xem thông báo và cảnh báo hệ thống"
              >
                {/* Badge số lượng thông báo nổi bật - chỉ hiển thị khi có tin chưa đọc, tắt hiệu ứng ping/bounce */}
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-2 -right-1 bg-rose-600 text-white font-black text-[11px] min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-lg">
                    {unreadAlertsCount}
                  </span>
                )}
                <div className="p-1 rounded-full bg-black/25 shrink-0">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 stroke-[2.5]" />
                </div>
                <div className="text-left leading-none">
                  <span className="block font-black text-xs sm:text-sm tracking-wider text-white">BÁO</span>
                  <span className="block text-[8px] sm:text-[9px] font-bold text-amber-200 uppercase tracking-wider mt-0.5">
                    {unreadAlertsCount > 0 ? `${unreadAlertsCount} MỚI` : "CHUÔNG"}
                  </span>
                </div>
              </button>

              {/* 3. NÚT CHI: ĐỎ ĐẬM CHỐNG PHẢN QUANG */}
              <button
                type="button"
                onClick={() => {
                  if (!quickExpenseForm.fromVaultId && vaults.length > 0) {
                    setQuickExpenseForm((prev) => ({ ...prev, fromVaultId: vaults[0].id }));
                  }
                  setShowQuickExpenseModal(true);
                }}
                style={{ backgroundColor: "#b91c1c", color: "#ffffff", borderColor: "#dc2626" }}
                className="group h-13 sm:h-15 rounded-2xl border-2 shadow-md shadow-rose-950/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer hover:brightness-105"
                title="Ghi nhận khoản CHI tiền ra"
              >
                <div className="p-1 rounded-full bg-black/25 shrink-0">
                  <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[3]" />
                </div>
                <div className="text-left leading-none">
                  <span className="block font-black text-sm sm:text-base tracking-wider text-white">CHI</span>
                  <span className="block text-[8px] sm:text-[9px] font-bold text-rose-100 uppercase tracking-widest mt-0.5">(-) RA</span>
                </div>
              </button>
            </div>
          </nav>
        )}

      {/* MODAL GHI NHANH GIAO DỊCH (Mục 2.1) */}
      {showQuickRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-[#BF512C]" />
                <h3 className="text-lg font-black text-[#0C2C47]">2.1 Ghi Nhanh Chuyển Động Tiền</h3>
              </div>
              <button onClick={() => setShowQuickRecordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFlow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mục đích / Tiêu đề</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Thu tiền bán hàng, Đổ xăng, Trả tiền nhà..."
                  value={flowForm.title}
                  onChange={(e) => setFlowForm({ ...flowForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại giao dịch</label>
                  <select
                    value={flowForm.type}
                    onChange={(e) => setFlowForm({ ...flowForm, type: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="expense">Chi tiền (Expense)</option>
                    <option value="income">Thu tiền (Income)</option>
                    <option value="transfer">Chuyển nội bộ giữa 2 Kho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số tiền (VNĐ)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={flowForm.amount}
                    onChange={(e) => setFlowForm({ ...flowForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-bold text-[#0C2C47]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {flowForm.type !== "income" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kho Nguồn (Trừ)</label>
                    <select
                      value={flowForm.fromVaultId}
                      onChange={(e) => setFlowForm({ ...flowForm, fromVaultId: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Chọn Kho Nguồn --</option>
                      {vaults.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.balance.toLocaleString("vi-VN")}₫)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Từ Khách Hàng / Đối tác</label>
                    <input
                      type="text"
                      placeholder="Người trả tiền..."
                      value={flowForm.fromTitle}
                      onChange={(e) => setFlowForm({ ...flowForm, fromTitle: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    />
                  </div>
                )}

                {flowForm.type !== "expense" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kho Đích (Cộng)</label>
                    <select
                      value={flowForm.toVaultId}
                      onChange={(e) => setFlowForm({ ...flowForm, toVaultId: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Chọn Kho Đích --</option>
                      {vaults.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.balance.toLocaleString("vi-VN")}₫)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nơi Nhận / Mục đích</label>
                    <input
                      type="text"
                      placeholder="Người nhận..."
                      value={flowForm.toTitle}
                      onChange={(e) => setFlowForm({ ...flowForm, toTitle: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nhãn phân loại (2.5)</label>
                  <input
                    type="text"
                    value={flowForm.tag}
                    onChange={(e) => setFlowForm({ ...flowForm, tag: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                    placeholder="Vd: Doanh thu, Ăn uống..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái (2.4)</label>
                  <select
                    value={flowForm.isActual ? "actual" : "planned"}
                    onChange={(e) => setFlowForm({ ...flowForm, isActual: e.target.value === "actual" })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                  >
                    <option value="actual">Thực tế phát sinh (Trừ/Cộng ngay)</option>
                    <option value="planned">Dự kiến kế hoạch (Chưa trừ tiền)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickRecordModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#BF512C] text-white text-xs font-black hover:bg-[#BF512C]/90"
                >
                  Ghi Nhận Ngay ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỐI CHIẾU SỐ DƯ (MỤC 2.6) */}
      {showReconcileModal && selectedVaultForReconcile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#0C2C47]" />
                <h3 className="text-base font-black text-[#0C2C47]">Đối Chiếu: {selectedVaultForReconcile.name}</h3>
              </div>
              <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Số dư hệ thống đang tính:</span>
                  <span className="font-bold text-slate-800">{selectedVaultForReconcile.balance.toLocaleString("vi-VN")} ₫</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Đếm tiền mặt thực tế hoặc xem app ngân hàng và điền số dư thực tế vào bên dưới.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số dư thực đếm (VNĐ)</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={reconcileForm.actualBalance}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, actualBalance: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-base font-black text-[#0C2C47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lý do / Ghi chú</label>
                <input
                  type="text"
                  value={reconcileForm.reason}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  placeholder="Vd: Quên ghi khoản đổ xăng, đối chiếu cuối ngày..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#0C2C47] text-white text-xs font-black hover:bg-[#0C2C47]/90"
                >
                  Xác Nhận Đối Chiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO MOBO (Money Box) MỚI */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#0C2C47] space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[#0C2C47] font-black">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47]">TẠO MOBO (Money Box) MỚI</h3>
                  <p className="text-[11px] text-slate-500">Ví tiền, tài khoản ngân hàng hoặc tài khoản nợ vay</p>
                </div>
              </div>
              <button
                onClick={() => setShowVaultModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên MoBo (Money Box) *</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Tài khoản ACB, Thẻ tín dụng VCB, Két tiền mặt..."
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-[#0C2C47]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phân Loại MoBo</label>
                  <select
                    value={vaultForm.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const isCredit = newType === "credit";
                      setVaultForm({
                        ...vaultForm,
                        type: newType,
                        isNegativeDebt: isCredit ? true : vaultForm.isNegativeDebt,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium"
                  >
                    <option value="bank">Ngân hàng (Bank)</option>
                    <option value="cash">Tiền mặt (Cash)</option>
                    <option value="ewallet">Ví điện tử (eWallet)</option>
                    <option value="reserve">Quỹ dự phòng (Reserve)</option>
                    <option value="credit">Vay nợ / Thấu chi ngân hàng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả / Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Mục đích sử dụng..."
                    value={vaultForm.description}
                    onChange={(e) => setVaultForm({ ...vaultForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Ngữ cảnh vay nợ tại ngân hàng / Thấu chi (Số dư âm) */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  vaultForm.isNegativeDebt
                    ? "bg-rose-50 border-rose-300 ring-1 ring-rose-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isNegativeDebtCreate"
                      checked={vaultForm.isNegativeDebt}
                      onChange={(e) => setVaultForm({ ...vaultForm, isNegativeDebt: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="isNegativeDebtCreate" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Ngữ cảnh đang vay nợ tại ngân hàng / Thấu chi (Hiển thị số âm -)
                    </label>
                  </div>
                  {vaultForm.isNegativeDebt && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-800">
                      Số dư âm (-)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  {vaultForm.isNegativeDebt
                    ? "Số tiền nhập dưới đây sẽ được ghi nhận là khoản nợ ngân hàng (mang giá trị âm), trừ vào tổng tài sản MoBo."
                    : "Đánh dấu nếu đây là tài khoản thẻ tín dụng, khoản vay ngân hàng hoặc tài khoản đang thấu chi."}
                </p>
              </div>

              {/* Màn hình nhập số cực to nền tối chữ sáng quy ước 1 = 1.000 VNĐ */}
              <div
                className={`bg-[#091522] border-2 rounded-2xl p-4 sm:p-5 text-center shadow-xl transition-all ${
                  vaultForm.isNegativeDebt
                    ? "border-rose-500 ring-2 ring-rose-500/30"
                    : "border-blue-500 ring-1 ring-blue-500/30"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
                  <span className={vaultForm.isNegativeDebt ? "text-rose-400" : "text-blue-400"}>
                    {vaultForm.isNegativeDebt ? "SỐ TIỀN VAY NỢ BAN ĐẦU" : "SỐ DƯ BAN ĐẦU"}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">QUY ƯỚC 1 = 1.000Đ</span>
                </div>
                <div className="flex items-center justify-center space-x-2 py-1">
                  {vaultForm.isNegativeDebt && (
                    <span className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">−</span>
                  )}
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0"
                    value={vaultForm.balanceUnits}
                    onChange={(e) => setVaultForm({ ...vaultForm, balanceUnits: e.target.value })}
                    className={`w-full text-center text-4xl sm:text-5xl font-black bg-transparent focus:outline-none placeholder-slate-700 font-mono cursor-pointer ${
                      vaultForm.isNegativeDebt ? "text-rose-300" : "text-blue-300"
                    }`}
                  />
                  <span
                    className={`text-2xl sm:text-3xl font-black ${
                      vaultForm.isNegativeDebt ? "text-rose-400" : "text-blue-400"
                    }`}
                  >
                    k
                  </span>
                </div>
                {vaultForm.balanceUnits && !isNaN(parseFloat(vaultForm.balanceUnits)) ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400">Thành tiền thực tế:</span>
                    <span
                      className={`text-base sm:text-lg font-black tracking-wide ${
                        vaultForm.isNegativeDebt ? "text-rose-400" : "text-amber-300"
                      }`}
                    >
                      {vaultForm.isNegativeDebt ? "− " : "+ "}
                      {(Math.round(Math.abs(parseFloat(vaultForm.balanceUnits)) * 1000)).toLocaleString("vi-VN")} Đồng
                      {vaultForm.isNegativeDebt && " (DƯ NỢ VAY NGÂN HÀNG)"}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Ví dụ: Nhập 50000 = {vaultForm.isNegativeDebt ? "−50.000.000đ nợ" : "50.000.000đ số dư"}
                  </p>
                )}
              </div>

              {/* Khóa quỹ thuế */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isLockedCreate"
                    checked={vaultForm.isLocked}
                    onChange={(e) => setVaultForm({ ...vaultForm, isLocked: e.target.checked })}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="isLockedCreate" className="text-xs text-slate-700 font-bold cursor-pointer flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cấu hình đặc biệt: Khóa một phần cho quỹ thuế</span>
                  </label>
                </div>
                {vaultForm.isLocked && (
                  <div className="pt-2 pl-6">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Số tiền khóa (Quy ước 1 = 1.000 VNĐ):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={vaultForm.lockedAmountUnits}
                        onChange={(e) => setVaultForm({ ...vaultForm, lockedAmountUnits: e.target.value })}
                        className="w-40 p-2 rounded-lg border border-slate-300 text-sm font-bold"
                      />
                      <span className="text-xs font-bold text-slate-500">k</span>
                      {vaultForm.lockedAmountUnits && (
                        <span className="text-xs font-black text-rose-600">
                          = {(Math.round(parseFloat(vaultForm.lockedAmountUnits) * 1000)).toLocaleString("vi-VN")} ₫
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0C2C47] hover:bg-[#0C2C47]/90 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Tạo MoBo Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA MOBO (Money Box) */}
      {editingVault && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#0C2C47] space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900 font-black">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47]">SỬA THÔNG TIN MOBO</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật tên, phân loại, số dư hoặc quỹ khóa</p>
                </div>
              </div>
              <button
                onClick={() => setEditingVault(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVault} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên MoBo (Money Box) *</label>
                <input
                  type="text"
                  required
                  placeholder="Tên MoBo..."
                  value={editVaultForm.name}
                  onChange={(e) => setEditVaultForm({ ...editVaultForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-[#0C2C47]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phân Loại MoBo</label>
                  <select
                    value={editVaultForm.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const isCredit = newType === "credit";
                      setEditVaultForm({
                        ...editVaultForm,
                        type: newType,
                        isNegativeDebt: isCredit ? true : editVaultForm.isNegativeDebt,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium"
                  >
                    <option value="bank">Ngân hàng (Bank)</option>
                    <option value="cash">Tiền mặt (Cash)</option>
                    <option value="ewallet">Ví điện tử (eWallet)</option>
                    <option value="reserve">Quỹ dự phòng (Reserve)</option>
                    <option value="credit">Vay nợ / Thấu chi ngân hàng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả / Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Mục đích sử dụng..."
                    value={editVaultForm.description}
                    onChange={(e) => setEditVaultForm({ ...editVaultForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Ngữ cảnh vay nợ tại ngân hàng / Thấu chi (Số dư âm) */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  editVaultForm.isNegativeDebt
                    ? "bg-rose-50 border-rose-300 ring-1 ring-rose-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isNegativeDebtEdit"
                      checked={editVaultForm.isNegativeDebt}
                      onChange={(e) => setEditVaultForm({ ...editVaultForm, isNegativeDebt: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="isNegativeDebtEdit" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Ngữ cảnh đang vay nợ tại ngân hàng / Thấu chi (Hiển thị số âm -)
                    </label>
                  </div>
                  {editVaultForm.isNegativeDebt && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-800">
                      Số dư âm (-)
                    </span>
                  )}
                </div>
              </div>

              {/* Màn hình nhập số cực to nền tối chữ sáng quy ước 1 = 1.000 VNĐ */}
              <div
                className={`bg-[#091522] border-2 rounded-2xl p-4 sm:p-5 text-center shadow-xl transition-all ${
                  editVaultForm.isNegativeDebt
                    ? "border-rose-500 ring-2 ring-rose-500/30"
                    : "border-blue-500 ring-1 ring-blue-500/30"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
                  <span className={editVaultForm.isNegativeDebt ? "text-rose-400" : "text-blue-400"}>
                    {editVaultForm.isNegativeDebt ? "ĐIỀU CHỈNH DƯ NỢ VAY" : "ĐIỀU CHỈNH SỐ DƯ"}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">QUY ƯỚC 1 = 1.000Đ</span>
                </div>
                <div className="flex items-center justify-center space-x-2 py-1">
                  {editVaultForm.isNegativeDebt && (
                    <span className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">−</span>
                  )}
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0"
                    value={editVaultForm.balanceUnits}
                    onChange={(e) => setEditVaultForm({ ...editVaultForm, balanceUnits: e.target.value })}
                    className={`w-full text-center text-4xl sm:text-5xl font-black bg-transparent focus:outline-none placeholder-slate-700 font-mono cursor-pointer ${
                      editVaultForm.isNegativeDebt ? "text-rose-300" : "text-blue-300"
                    }`}
                  />
                  <span
                    className={`text-2xl sm:text-3xl font-black ${
                      editVaultForm.isNegativeDebt ? "text-rose-400" : "text-blue-400"
                    }`}
                  >
                    k
                  </span>
                </div>
                {editVaultForm.balanceUnits && !isNaN(parseFloat(editVaultForm.balanceUnits)) ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                    <span className="text-[11px] text-slate-400">Thành tiền thực tế:</span>
                    <span
                      className={`text-base sm:text-lg font-black tracking-wide ${
                        editVaultForm.isNegativeDebt ? "text-rose-400" : "text-amber-300"
                      }`}
                    >
                      {editVaultForm.isNegativeDebt ? "− " : "+ "}
                      {(Math.round(Math.abs(parseFloat(editVaultForm.balanceUnits)) * 1000)).toLocaleString("vi-VN")} Đồng
                      {editVaultForm.isNegativeDebt && " (DƯ NỢ VAY NGÂN HÀNG)"}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Nhập số đơn vị: 1 = 1.000 VNĐ
                  </p>
                )}
              </div>

              {/* Khóa quỹ thuế */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isLockedEdit"
                    checked={editVaultForm.isLocked}
                    onChange={(e) => setEditVaultForm({ ...editVaultForm, isLocked: e.target.checked })}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="isLockedEdit" className="text-xs text-slate-700 font-bold cursor-pointer flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Khóa một phần cho quỹ thuế</span>
                  </label>
                </div>
                {editVaultForm.isLocked && (
                  <div className="pt-2 pl-6">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Số tiền khóa (Quy ước 1 = 1.000 VNĐ):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={editVaultForm.lockedAmountUnits}
                        onChange={(e) => setEditVaultForm({ ...editVaultForm, lockedAmountUnits: e.target.value })}
                        className="w-40 p-2 rounded-lg border border-slate-300 text-sm font-bold"
                      />
                      <span className="text-xs font-bold text-slate-500">k</span>
                      {editVaultForm.lockedAmountUnits && (
                        <span className="text-xs font-black text-rose-600">
                          = {(Math.round(parseFloat(editVaultForm.lockedAmountUnits) * 1000)).toLocaleString("vi-VN")} ₫
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingVault(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0C2C47] hover:bg-[#0C2C47]/90 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XÓA MOBO (BẮT BUỘC SỐ DƯ = 0 Đ, CHUYỂN +/- SANG MOBO KHÁC) */}
      {deletingVault && (() => {
        const isZeroBalance = Math.abs(deletingVault.balance) < 0.001;
        const isPositive = deletingVault.balance > 0;
        const otherVaults = vaults.filter((v) => v.id !== deletingVault.id);
        const selectedTarget = otherVaults.find((v) => v.id === targetTransferVaultId) || otherVaults[0];

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-rose-600 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      XÓA MOBO: {deletingVault.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">Quy chuẩn an toàn: Bắt buộc số dư phải về 0 đ</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingVault(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông tin số dư hiện tại */}
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  isZeroBalance
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Số dư MoBo hiện tại:</span>
                  <span
                    className={`text-base font-black ${
                      isZeroBalance
                        ? "text-emerald-700"
                        : deletingVault.balance < 0
                        ? "text-rose-700"
                        : "text-amber-800"
                    }`}
                  >
                    {deletingVault.balance < 0
                      ? `-${Math.abs(deletingVault.balance).toLocaleString("vi-VN")} ₫ (Nợ vay)`
                      : `${deletingVault.balance.toLocaleString("vi-VN")} ₫`}
                  </span>
                </div>

                {isZeroBalance ? (
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold pt-1 border-t border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>MoBo có số dư đúng bằng 0 đ. Đủ điều kiện xóa an toàn khỏi hệ thống!</span>
                  </div>
                ) : (
                  <div className="space-y-1 pt-1 border-t border-amber-200">
                    <div className="flex items-center space-x-1.5 font-black text-rose-700">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Số dư khác 0 đ! Bắt buộc chuyển toàn bộ sang MoBo khác trước khi xóa.</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Để tránh thất thoát sổ sách kế toán, bạn có quyền chuyển toàn bộ số tiền (+) hoặc dư nợ (−) của MoBo này sang một MoBo chỉ định.
                    </p>
                  </div>
                )}
              </div>

              {/* Nếu số dư khác 0: Form chọn MoBo tiếp nhận kết chuyển */}
              {!isZeroBalance && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-black text-slate-800 uppercase">
                    CHỌN MOBO TIẾP NHẬN SỐ DƯ ({isPositive ? "TIỀN DƯƠNG +" : "DƯ NỢ VAY −"}) *
                  </label>

                  {otherVaults.length === 0 ? (
                    <p className="text-xs text-rose-600 font-bold">
                      Không còn MoBo nào khác để chuyển giao số dư. Vui lòng tạo thêm một MoBo khác hoặc đưa số dư về 0 đ trước khi xóa.
                    </p>
                  ) : (
                    <>
                      <select
                        value={targetTransferVaultId}
                        onChange={(e) => setTargetTransferVaultId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:ring-2 focus:ring-[#0C2C47]"
                      >
                        {otherVaults.map((ov) => (
                          <option key={ov.id} value={ov.id}>
                            {ov.name} (Hiện có: {ov.balance.toLocaleString("vi-VN")} ₫)
                          </option>
                        ))}
                      </select>

                      {selectedTarget && (
                        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                          <span className="font-bold block">Tác động kết chuyển tự động:</span>
                          {isPositive ? (
                            <p className="text-[11px]">
                              Toàn bộ <b>+{deletingVault.balance.toLocaleString("vi-VN")} ₫</b> sẽ chuyển sang MoBo <b>"{selectedTarget.name}"</b> (Số dư mới: {(selectedTarget.balance + deletingVault.balance).toLocaleString("vi-VN")} ₫). MoBo <b>"{deletingVault.name}"</b> sẽ về 0 đ và được xóa vĩnh viễn.
                            </p>
                          ) : (
                            <p className="text-[11px]">
                              Toàn bộ khoản nợ <b>{deletingVault.balance.toLocaleString("vi-VN")} ₫</b> sẽ chuyển sang gánh bởi MoBo <b>"{selectedTarget.name}"</b> (Số dư mới: {(selectedTarget.balance + deletingVault.balance).toLocaleString("vi-VN")} ₫). MoBo <b>"{deletingVault.name}"</b> sẽ về 0 đ và được xóa vĩnh viễn.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingVault(null)}
                  className="py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={!isZeroBalance && otherVaults.length === 0}
                  onClick={handleDeleteVaultConfirm}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isZeroBalance ? "Xác Nhận Xóa MoBo" : "Chuyển Giao Số Dư & Xóa"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: NHẬP NHANH THU TIỀN VÀO (XANH LÁ - SỐ TO RÕ RÀNG) */}
      {showQuickIncomeModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-t-4 sm:border border-emerald-500 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ArrowDownLeft className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-800">GHI NHẬN TIỀN THU (+)</h3>
                  <p className="text-[11px] text-slate-500">Tiền vào kho chứa thực tế</p>
                </div>
              </div>
              <button onClick={() => setShowQuickIncomeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleQuickIncomeSubmit} className="space-y-4">
              {/* MÀN HÌNH SỐ TIỀN CỰC TO NỀN TỐI CHỮ SÁNG TRÁNH NHẬP SAI */}
              <div className="bg-[#08131d] border-2 border-emerald-500 rounded-2xl p-5 sm:p-6 text-center shadow-2xl shadow-emerald-950/60 ring-1 ring-emerald-500/30">
                <span className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">
                  SỐ TIỀN THU NHẬN (VNĐ)
                </span>
                <div className="flex items-center justify-center space-x-2 py-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={quickIncomeForm.amount}
                    onChange={(e) => setQuickIncomeForm({ ...quickIncomeForm, amount: e.target.value })}
                    className="w-full text-center text-4xl sm:text-5xl font-black text-emerald-300 bg-transparent focus:outline-none placeholder-slate-700 tracking-tight font-mono selection:bg-emerald-500 selection:text-black cursor-pointer"
                  />
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400">₫</span>
                </div>
                {quickIncomeForm.amount && !isNaN(parseFloat(quickIncomeForm.amount)) ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                    <span className="text-sm sm:text-base font-black text-amber-300 tracking-wide">
                      = {parseFloat(quickIncomeForm.amount).toLocaleString("vi-VN")} Đồng
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Chạm các nút mệnh giá hoặc bấm vào ô số để gõ</p>
                )}
              </div>

              {/* CÁC MỆNH GIÁ NHẬP NHANH: 1k - 2k - 10k - 20k - 50k - 100k - 200k - 500k + XÓA (ĐÃ BỎ 3K) */}
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5">
                  Mệnh giá nhập nhanh (Cộng dồn)
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-xs font-black">
                  {[
                    { label: "+1K", val: 1000 },
                    { label: "+2K", val: 2000 },
                    { label: "+10K", val: 10000 },
                    { label: "+20K", val: 20000 },
                    { label: "+50K", val: 50000 },
                    { label: "+100K", val: 100000 },
                    { label: "+200K", val: 200000 },
                    { label: "+500K", val: 500000 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(quickIncomeForm.amount) || 0;
                        setQuickIncomeForm({ ...quickIncomeForm, amount: String(cur + item.val) });
                      }}
                      className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-300 transition text-slate-800 active:scale-95 shadow-xs cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQuickIncomeForm({ ...quickIncomeForm, amount: "" })}
                    className="col-span-2 py-2.5 px-1 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-300 transition active:scale-95 font-black cursor-pointer"
                  >
                    Xóa số
                  </button>
                </div>
              </div>

              {/* CHỌN KHO NHẬN TIỀN (NGUỒN ĐÍCH) */}
              <div>
                <label className="block text-xs font-black text-[#0C2C47] uppercase mb-1.5">
                  Chọn Kho Nhận Tiền (Vào đâu?)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {vaults.map((v) => {
                    const isSelected = quickIncomeForm.toVaultId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setQuickIncomeForm({ ...quickIncomeForm, toVaultId: v.id })}
                        className={`p-3 rounded-xl text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400"
                            : "border-slate-200 hover:border-emerald-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 truncate">{v.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-black text-emerald-700 mt-1">
                          {v.balance.toLocaleString("vi-VN")} ₫
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÃN & MỤC ĐÍCH THU */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nhãn giao dịch</label>
                  <select
                    value={quickIncomeForm.tag}
                    onChange={(e) => setQuickIncomeForm({ ...quickIncomeForm, tag: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-slate-800"
                  >
                    <option value="Doanh thu">Doanh thu bán hàng</option>
                    <option value="Thu nợ">Thu hồi nợ</option>
                    <option value="Tiền thưởng">Thưởng / Thu nhập khác</option>
                    <option value="Nội bộ">Chuyển nội bộ</option>
                    <option value="Khác">Khoản thu khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    placeholder="Vd: Khách trả tiền..."
                    value={quickIncomeForm.title}
                    onChange={(e) => setQuickIncomeForm({ ...quickIncomeForm, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* TRƯỜNG DỰ KIẾN NGÀY Ở BOTTOM: NÚT TICK DỰ KIẾN, KHÔNG TICK THÌ MẶC ĐỊNH LÀ HÔM NAY HIỂN THỊ GIỜ PHÚT */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickIncomeForm.isExpected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setQuickIncomeForm({
                          ...quickIncomeForm,
                          isExpected: checked,
                          isActual: !checked,
                          flowDate: checked ? quickIncomeForm.flowDate : new Date().toISOString().split("T")[0],
                        });
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-800">Dự kiến ngày (kế hoạch)</span>
                  </label>

                  {/* Khi KHÔNG tick: hiển thị mặc định là hôm nay + giờ phút */}
                  {!quickIncomeForm.isExpected ? (
                    <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-black">Hôm nay</span>
                      <span className="text-xs font-mono font-bold text-slate-600">{getCurrentDateTime().timeStr}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Chưa cộng tiền
                    </span>
                  )}
                </div>

                {/* Khi CÓ tick: cho phép chọn ngày dự kiến cụ thể */}
                {quickIncomeForm.isExpected && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-xs text-slate-500">Chọn ngày dự kiến thu:</span>
                    <input
                      type="date"
                      value={quickIncomeForm.flowDate}
                      onChange={(e) => {
                        setQuickIncomeForm({
                          ...quickIncomeForm,
                          flowDate: e.target.value,
                        });
                      }}
                      className="p-1.5 rounded-xl border border-amber-300 text-xs font-bold text-[#0C2C47] bg-white cursor-pointer shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* NÚT BẤM XÁC NHẬN TO RÕ */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickIncomeModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition transform active:scale-95 cursor-pointer"
                >
                  <ArrowDownLeft className="w-5 h-5 stroke-[3]" />
                  <span>{!quickIncomeForm.isExpected ? "XÁC NHẬN THU NGAY (+)" : "LƯU KẾ HOẠCH DỰ KIẾN THU (+)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NHẬP NHANH CHI TIỀN RA (ĐỎ - SỐ TO RÕ RÀNG) */}
      {showQuickExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-t-4 sm:border border-rose-500 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                  <ArrowUpRight className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-800">GHI NHẬN TIỀN CHI (-)</h3>
                  <p className="text-[11px] text-slate-500">Rút tiền từ kho để chi trả</p>
                </div>
              </div>
              <button onClick={() => setShowQuickExpenseModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleQuickExpenseSubmit} className="space-y-4">
              {/* MÀN HÌNH SỐ TIỀN CỰC TO NỀN TỐI CHỮ SÁNG TRÁNH NHẬP SAI */}
              <div className="bg-[#180a0d] border-2 border-rose-500 rounded-2xl p-5 sm:p-6 text-center shadow-2xl shadow-rose-950/60 ring-1 ring-rose-500/30">
                <span className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-2">
                  SỐ TIỀN CHI RA (VNĐ)
                </span>
                <div className="flex items-center justify-center space-x-2 py-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={quickExpenseForm.amount}
                    onChange={(e) => setQuickExpenseForm({ ...quickExpenseForm, amount: e.target.value })}
                    className="w-full text-center text-4xl sm:text-5xl font-black text-rose-300 bg-transparent focus:outline-none placeholder-slate-700 tracking-tight font-mono selection:bg-rose-500 selection:text-black cursor-pointer"
                  />
                  <span className="text-3xl sm:text-4xl font-black text-rose-400">₫</span>
                </div>
                {quickExpenseForm.amount && !isNaN(parseFloat(quickExpenseForm.amount)) ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                    <span className="text-sm sm:text-base font-black text-amber-300 tracking-wide">
                      = {parseFloat(quickExpenseForm.amount).toLocaleString("vi-VN")} Đồng
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Chạm các nút mệnh giá hoặc bấm vào ô số để gõ</p>
                )}
              </div>

              {/* CÁC MỆNH GIÁ NHẬP NHANH: 1k - 2k - 10k - 20k - 50k - 100k - 200k - 500k + XÓA (ĐÃ BỎ 3K) */}
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5">
                  Mệnh giá nhập nhanh (Cộng dồn)
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-xs font-black">
                  {[
                    { label: "+1K", val: 1000 },
                    { label: "+2K", val: 2000 },
                    { label: "+10K", val: 10000 },
                    { label: "+20K", val: 20000 },
                    { label: "+50K", val: 50000 },
                    { label: "+100K", val: 100000 },
                    { label: "+200K", val: 200000 },
                    { label: "+500K", val: 500000 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(quickExpenseForm.amount) || 0;
                        setQuickExpenseForm({ ...quickExpenseForm, amount: String(cur + item.val) });
                      }}
                      className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-800 border border-slate-300 transition text-slate-800 active:scale-95 shadow-xs cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQuickExpenseForm({ ...quickExpenseForm, amount: "" })}
                    className="col-span-2 py-2.5 px-1 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300 transition active:scale-95 font-black cursor-pointer"
                  >
                    Xóa số
                  </button>
                </div>
              </div>

              {/* CHỌN KHO CHI TIỀN (NGUỒN XUẤT) KÈM SỐ DƯ */}
              <div>
                <label className="block text-xs font-black text-[#0C2C47] uppercase mb-1.5">
                  Chọn Kho Chi Tiền (Rút từ đâu?)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {vaults.map((v) => {
                    const isSelected = quickExpenseForm.fromVaultId === v.id;
                    const reqAmount = parseFloat(quickExpenseForm.amount) || 0;
                    const isLowBalance = v.balance < reqAmount;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setQuickExpenseForm({ ...quickExpenseForm, fromVaultId: v.id })}
                        className={`p-3 rounded-xl text-left border-2 transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-rose-600 bg-rose-50/80 shadow-md ring-2 ring-rose-400"
                            : "border-slate-200 hover:border-rose-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 truncate">{v.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-rose-600 stroke-[3]" />}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs font-black ${isLowBalance ? "text-amber-600" : "text-slate-700"}`}>
                            {v.balance.toLocaleString("vi-VN")} ₫
                          </span>
                          {isLowBalance && <span className="text-[10px] text-amber-600 font-bold">Thấp</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* NHÃN & MỤC ĐÍCH CHI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nhãn chi tiêu</label>
                  <select
                    value={quickExpenseForm.tag}
                    onChange={(e) => setQuickExpenseForm({ ...quickExpenseForm, tag: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-slate-800"
                  >
                    <option value="Chi phí">Chi phí vận hành</option>
                    <option value="Ăn uống">Ăn uống / Tiếp khách</option>
                    <option value="Nhập hàng">Nhập hàng / Vật tư</option>
                    <option value="Trả nợ">Trả nợ đối tác</option>
                    <option value="Thuế">Nộp thuế</option>
                    <option value="Khác">Chi tiêu khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mô tả ngắn</label>
                  <input
                    type="text"
                    placeholder="Vd: Mua đồ văn phòng, đổ xăng..."
                    value={quickExpenseForm.title}
                    onChange={(e) => setQuickExpenseForm({ ...quickExpenseForm, title: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* TRƯỜNG DỰ KIẾN NGÀY Ở BOTTOM: NÚT TICK DỰ KIẾN, KHÔNG TICK THÌ MẶC ĐỊNH LÀ HÔM NAY HIỂN THỊ GIỜ PHÚT */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickExpenseForm.isExpected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setQuickExpenseForm({
                          ...quickExpenseForm,
                          isExpected: checked,
                          isActual: !checked,
                          flowDate: checked ? quickExpenseForm.flowDate : new Date().toISOString().split("T")[0],
                        });
                      }}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-800">Dự kiến ngày (kế hoạch)</span>
                  </label>

                  {/* Khi KHÔNG tick: hiển thị mặc định là hôm nay + giờ phút */}
                  {!quickExpenseForm.isExpected ? (
                    <div className="flex items-center space-x-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-xs font-black">Hôm nay</span>
                      <span className="text-xs font-mono font-bold text-slate-600">{getCurrentDateTime().timeStr}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Chưa trừ tiền
                    </span>
                  )}
                </div>

                {/* Khi CÓ tick: cho phép chọn ngày dự kiến cụ thể */}
                {quickExpenseForm.isExpected && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-xs text-slate-500">Chọn ngày dự kiến chi:</span>
                    <input
                      type="date"
                      value={quickExpenseForm.flowDate}
                      onChange={(e) => {
                        setQuickExpenseForm({
                          ...quickExpenseForm,
                          flowDate: e.target.value,
                        });
                      }}
                      className="p-1.5 rounded-xl border border-amber-300 text-xs font-bold text-[#0C2C47] bg-white cursor-pointer shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* NÚT BẤM XÁC NHẬN TO RÕ */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickExpenseModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition transform active:scale-95 cursor-pointer"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[3]" />
                  <span>{!quickExpenseForm.isExpected ? "XÁC NHẬN CHI NGAY (-)" : "LƯU KẾ HOẠCH DỰ KIẾN CHI (-)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CẤU HÌNH NHẮC NHỞ & CHUÔNG ĐẶC QUYỀN */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0C2C47]">Nhắc Nhở & Chuông Tài Chính</h3>
                  <p className="text-xs text-slate-500">Hẹn giờ xem báo cáo với chuông tiền đặc quyền</p>
                </div>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* BẬT / TẮT NHẮC NHỞ */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-sm font-bold text-slate-800 block">Kích hoạt chuông nhắc nhở</span>
                <span className="text-xs text-slate-500">Tự động phát chuông và báo thức khi đến giờ</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderConfig.enabled}
                  onChange={(e) => handleSaveReminder({ ...reminderConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* CHẾ ĐỘ HẸN GIỜ */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#0C2C47] uppercase">1. Chế độ hẹn giờ</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveReminder({ ...reminderConfig, mode: "daily" })}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    reminderConfig.mode === "daily"
                      ? "border-amber-500 bg-amber-50/60 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold text-xs block text-slate-800">⏰ Cố định hàng ngày</span>
                  <span className="text-[11px] text-slate-500">Nhắc vào một khung giờ mỗi ngày</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = Date.now() + reminderConfig.countdownMinutes * 60 * 1000;
                    handleSaveReminder({ ...reminderConfig, mode: "countdown", countdownTarget: target });
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    reminderConfig.mode === "countdown"
                      ? "border-amber-500 bg-amber-50/60 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-bold text-xs block text-slate-800">⏳ Đếm ngược chu kỳ</span>
                  <span className="text-[11px] text-slate-500">Nhắc sau X phút kể từ bây giờ</span>
                </button>
              </div>

              {/* INPUT THEO CHẾ ĐỘ */}
              {reminderConfig.mode === "daily" ? (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Giờ chốt sổ & xem tài chính</span>
                    <span className="text-[11px] text-slate-500">Ví dụ: 20:00 hoặc 21:30 hàng ngày</span>
                  </div>
                  <input
                    type="time"
                    value={reminderConfig.dailyTime}
                    onChange={(e) => handleSaveReminder({ ...reminderConfig, dailyTime: e.target.value })}
                    className="p-2 rounded-lg border border-slate-300 text-base font-black text-[#0C2C47] bg-white"
                  />
                </div>
              ) : (
                <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Thời gian đếm ngược</span>
                    <span className="text-xs font-black text-amber-700">{countdownText || `${reminderConfig.countdownMinutes} phút`}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                    {[15, 30, 60, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          const target = Date.now() + mins * 60 * 1000;
                          handleSaveReminder({
                            ...reminderConfig,
                            countdownMinutes: mins,
                            countdownTarget: target,
                          });
                        }}
                        className={`py-1.5 rounded-lg border transition ${
                          reminderConfig.countdownMinutes === mins
                            ? "bg-amber-500 text-white border-amber-600"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {mins < 60 ? `${mins}p` : `${mins / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CHỌN KIỂU CHUÔNG THÔNG BÁO ĐẶC QUYỀN */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#0C2C47] uppercase">2. Kiểu chuông đặc quyền</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* LENG KENG TIỀN XU */}
                <div
                  onClick={() => handleSaveReminder({ ...reminderConfig, soundType: "coin" })}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    reminderConfig.soundType === "coin"
                      ? "border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-300"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🪙</span>
                      <span className="font-bold text-xs text-slate-800">Leng Keng Tiền Xu</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Âm kim loại vàng/bạc va chạm ngân vang, trong trẻo và kích tài lộc.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-amber-700">Coin Clinking</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        isPlayingSoundTest === "income" ? handleStopSoundTest() : handleTestSound("income");
                      }}
                      className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center space-x-1"
                    >
                      {isPlayingSoundTest === "income" ? (
                        <>
                          <Square className="w-3 h-3 fill-white" />
                          <span>Dừng</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>Thử chuông</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* MÁY ĐẾM TIỀN */}
                <div
                  onClick={() => handleSaveReminder({ ...reminderConfig, soundType: "cash_counter" })}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    reminderConfig.soundType === "cash_counter"
                      ? "border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-300"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">💵</span>
                      <span className="font-bold text-xs text-slate-800">Tiếng Máy Đếm Tiền</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nhịp rào rào tạch tạch của từng xếp tiền polyme chạy qua lô đếm.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-amber-700">Cash Counter</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        isPlayingSoundTest === "expense" ? handleStopSoundTest() : handleTestSound("expense");
                      }}
                      className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center space-x-1"
                    >
                      {isPlayingSoundTest === "expense" ? (
                        <>
                          <Square className="w-3 h-3 fill-white" />
                          <span>Dừng</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>Thử chuông</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* THỜI LƯỢNG CHUÔNG KÊU */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Thời lượng chuông kêu</span>
                <span className="text-[11px] text-slate-500">Chuông phát liên tục trong bao lâu</span>
              </div>
              <div className="flex items-center space-x-2">
                {[3, 5, 8, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSaveReminder({ ...reminderConfig, durationSeconds: sec })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      reminderConfig.durationSeconds === sec
                        ? "bg-[#0C2C47] text-white"
                        : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* THÔNG BÁO TRÌNH DUYỆT (NOTIFICATION) */}
            {notificationPermission !== "granted" && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                <div className="pr-2">
                  <span className="text-xs font-bold text-blue-900 block">Bật thông báo đẩy</span>
                  <span className="text-[11px] text-blue-700">Nhận thông báo kể cả khi chuyển tab khác</span>
                </div>
                <button
                  type="button"
                  onClick={requestNotifyPermission}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 whitespace-nowrap"
                >
                  Cấp quyền
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  stopAllSounds();
                  setShowReminderModal(false);
                }}
                className="w-full py-3 rounded-xl bg-[#0C2C47] text-white text-xs font-black hover:bg-[#0C2C47]/90 shadow-md transition cursor-pointer"
              >
                ĐÃ LƯU CÀI ĐẶT NHẮC NHỞ ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BÁO THỨC / ĐẾN GIỜ XEM BÁO CÁO TÀI CHÍNH */}
      {showAlarmAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-amber-400 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 mx-auto flex items-center justify-center shadow-lg text-amber-600 animate-bounce">
              <Bell className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                Đến Giờ Chốt Sổ & Kiểm Tra
              </span>
              <h3 className="text-2xl font-black text-[#0C2C47] mt-2">ĐÃ ĐẾN GIỜ XEM TÀI CHÍNH!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Dành 2 phút đối chiếu dòng tiền hôm nay để giữ tài sản luôn an toàn và sinh lời.
              </p>
            </div>

            {/* TÓM TẮT NHANH TÀI SẢN RÒNG */}
            <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-sm text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tài sản ròng hiện tại</span>
              <span className="text-xl font-black text-[#0C2C47]">{netWorth.toLocaleString("vi-VN")} ₫</span>
              <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                <span>Tổng tiền trong các kho:</span>
                <span className="font-bold text-emerald-700">{totalBalance.toLocaleString("vi-VN")} ₫</span>
              </div>
            </div>

            {/* NÚT THAO TÁC */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopAllSounds();
                  setShowAlarmAlertModal(false);
                  setActiveTab("home");
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02] cursor-pointer"
              >
                📊 XEM CHI TIẾT THU CHI & CHỐT SỔ NGAY ➔
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAllSounds();
                  setShowAlarmAlertModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Đã xem / Tắt chuông
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL SỬA DÒNG TIỀN / SỰ KIỆN DỰ CHI DỰ THU (Quy ước 1 = 1.000 VNĐ) */}
      {editingFlow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-slate-300 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47]">
                    SỬA SỐ LIỆU: {editingFlow.isActual ? "DÒNG CHẢY THỰC TẾ" : "KẾ HOẠCH DỰ KIẾN"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Quy ước nhập số: <span className="font-bold text-blue-700">1 = 1.000 VNĐ</span> (Vd: 20 = 20.000đ, 50000 = 50 triệu)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingFlow(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFlow} className="space-y-4">
              {/* Màn hình nhập số tiền cực to nền tối chữ sáng quy ước 1 = 1.000 */}
              <div className="bg-[#091522] border-2 border-blue-500 rounded-2xl p-5 text-center shadow-xl ring-1 ring-blue-500/30">
                <div className="flex items-center justify-between text-xs font-black text-blue-400 uppercase tracking-wider mb-2">
                  <span>SỐ ĐƠN VỊ NHẬP (1 = 1.000Đ)</span>
                  <span className="text-[10px] text-amber-300 font-bold">QUY ƯỚC 1=1K</span>
                </div>
                <div className="flex items-center justify-center space-x-2 py-1">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    required
                    placeholder="0"
                    value={editFlowForm.amountUnits}
                    onChange={(e) => setEditFlowForm({ ...editFlowForm, amountUnits: e.target.value })}
                    className="w-full text-center text-4xl sm:text-5xl font-black text-blue-300 bg-transparent focus:outline-none placeholder-slate-700 font-mono cursor-pointer"
                  />
                  <span className="text-2xl sm:text-3xl font-black text-blue-400">k</span>
                </div>
                {editFlowForm.amountUnits && !isNaN(parseFloat(editFlowForm.amountUnits)) ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                    <span className="text-xs text-slate-400">Thành tiền thực tế:</span>
                    <span className="text-base sm:text-lg font-black text-amber-300 tracking-wide">
                      = {(Math.round(parseFloat(editFlowForm.amountUnits) * 1000)).toLocaleString("vi-VN")} Đồng
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Ví dụ: gõ 50 = 50.000₫ | gõ 10000 = 10.000.000₫</p>
                )}
              </div>

              {/* Phím số nhanh mệnh giá */}
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5">
                  Phím cộng nhanh (theo đơn vị k):
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-black">
                  {[
                    { label: "+10k", val: 10 },
                    { label: "+50k", val: 50 },
                    { label: "+100k", val: 100 },
                    { label: "+500k", val: 500 },
                    { label: "+1 Tr", val: 1000 },
                    { label: "+5 Tr", val: 5000 },
                    { label: "+10 Tr", val: 10000 },
                    { label: "+50 Tr", val: 50000 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(editFlowForm.amountUnits) || 0;
                        setEditFlowForm({ ...editFlowForm, amountUnits: (cur + btn.val).toString() });
                      }}
                      className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-blue-100 hover:text-blue-800 border border-slate-300 transition text-slate-800 active:scale-95 shadow-2xs cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tên mục / tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu đề / Mục đích</label>
                <input
                  type="text"
                  required
                  value={editFlowForm.title}
                  onChange={(e) => setEditFlowForm({ ...editFlowForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Ngày phát sinh / dự kiến */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {editingFlow.isActual ? "Ngày phát sinh" : "Ngày dự kiến"}
                  </label>
                  <input
                    type="date"
                    value={editFlowForm.flowDate}
                    onChange={(e) => setEditFlowForm({ ...editFlowForm, flowDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nhãn giao dịch</label>
                  <input
                    type="text"
                    value={editFlowForm.tag}
                    onChange={(e) => setEditFlowForm({ ...editFlowForm, tag: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                    placeholder="Nhãn..."
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFlow(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Lưu Chỉnh Sửa ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POPUP XÁC NHẬN XÓA SỐ LIỆU */}
      {flowToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#0C2C47]">XÁC NHẬN XÓA DỮ LIỆU</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa mục này khỏi sổ sách kế toán không?
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Mục đích:</span>
                <span className="font-bold text-slate-800">{flowToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-black text-rose-700 text-sm">{flowToDelete.amount.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-slate-700">{flowToDelete.isActual ? "Đã trừ/cộng kho thực tế" : "Kế hoạch dự kiến"}</span>
              </div>
              {flowToDelete.isActual && (
                <p className="text-[11px] text-amber-700 pt-1 border-t border-slate-200 font-semibold">
                  ⚠️ Lưu ý: Vì là giao dịch thực tế, số tiền sẽ được tự động hoàn trả/cân đối lại kho ban đầu.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFlowToDelete(null)}
                className="py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteFlowConfirm}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Đồng Ý Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP CHỈNH SỬA SỐ LIỆU CÀI ĐẶT (7.4 & 7.5 - Quy ước 1 = 1.000 VNĐ) */}
      {settingEditModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-[#0C2C47] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-black text-sm">
                  1k
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0C2C47] uppercase">{settingEditModal.title}</h3>
                  <p className="text-[10px] text-slate-500">Quy ước nhập số: 1 = 1.000 VNĐ</p>
                </div>
              </div>
              <button
                onClick={() => setSettingEditModal({ ...settingEditModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">{settingEditModal.description}</p>

            {/* Màn hình nhập số cực to nền tối chữ sáng */}
            <div className="bg-[#091522] border-2 border-amber-400 rounded-2xl p-5 text-center shadow-xl">
              <span className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">
                NHẬP SỐ ĐƠN VỊ (QUY ƯỚC 1 = 1.000 VNĐ)
              </span>
              <div className="flex items-center justify-center space-x-2 py-1">
                <input
                  type="number"
                  step="any"
                  inputMode="numeric"
                  required
                  placeholder="0"
                  value={settingEditModal.inputUnits}
                  onChange={(e) => setSettingEditModal({ ...settingEditModal, inputUnits: e.target.value })}
                  className="w-full text-center text-4xl sm:text-5xl font-black text-amber-300 bg-transparent focus:outline-none placeholder-slate-700 font-mono cursor-pointer"
                />
                <span className="text-3xl font-black text-amber-400">k</span>
              </div>
              {settingEditModal.inputUnits && !isNaN(parseFloat(settingEditModal.inputUnits)) ? (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col items-center">
                  <span className="text-xs text-slate-400">Giá trị thực tế sẽ lưu:</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-wide">
                    = {(Math.round(parseFloat(settingEditModal.inputUnits) * 1000)).toLocaleString("vi-VN")} Đồng
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Ví dụ: gõ 50000 = 50 triệu | gõ 200000 = 200 triệu</p>
              )}
            </div>

            {/* Phím cộng nhanh */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1.5">
                Các mức phổ biến:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-black">
                {[
                  { label: "10 Tr", val: 10000 },
                  { label: "20 Tr", val: 20000 },
                  { label: "50 Tr", val: 50000 },
                  { label: "100 Tr", val: 100000 },
                  { label: "200 Tr", val: 200000 },
                  { label: "500 Tr", val: 500000 },
                  { label: "1 Tỷ", val: 1000000 },
                  { label: "2 Tỷ", val: 2000000 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() =>
                      setSettingEditModal({
                        ...settingEditModal,
                        inputUnits: item.val.toString(),
                      })
                    }
                    className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 transition text-slate-800 cursor-pointer shadow-2xs text-[11px]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettingEditModal({ ...settingEditModal, isOpen: false })}
                className="py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSettingFromModal}
                className="py-2.5 rounded-xl bg-[#0C2C47] hover:bg-[#0C2C47]/90 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Lưu Số Liệu Ngay ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRUNG TÂM THÔNG BÁO HỆ THỐNG */}
      {showNotificationCenterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#0C2C47] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shadow-2xs">
                  <Bell className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47] uppercase tracking-wide">
                    Trung Tâm Thông Báo Hệ Thống
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cảnh báo dự thu/chi, ngưỡng nợ, hạn mức kho & lịch sử thu chi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationCenterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chuyển Tab: Cảnh báo & Kế hoạch VS Lịch sử thu chi */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => setNotifCenterTab("alerts")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    notifCenterTab === "alerts"
                      ? "bg-[#0C2C47] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  🔔 Cảnh Báo ({allSystemAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifCenterTab("history")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    notifCenterTab === "history"
                      ? "bg-[#0C2C47] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  📜 Lịch Sử Thu Chi
                </button>
              </div>

              {notifCenterTab === "alerts" && allSystemAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAlertsAsRead}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  ✓ Đã đọc tất cả
                </button>
              )}
            </div>

            {/* Nội dung theo Tab */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {notifCenterTab === "alerts" ? (
                allSystemAlerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2.5">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="font-bold text-sm text-slate-800">Tất cả chỉ số đều an toàn</p>
                    <p className="text-xs text-slate-400">
                      Không có cảnh báo vượt hạn mức hoặc nhắc nhở nào đang chờ xử lý.
                    </p>
                  </div>
                ) : (
                  allSystemAlerts.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-2xs transition ${
                        item.severity === "danger"
                          ? "bg-rose-50/90 border-rose-200 text-rose-950"
                          : item.severity === "warning"
                          ? "bg-amber-50/90 border-amber-200 text-amber-950"
                          : "bg-blue-50/90 border-blue-200 text-blue-950"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.severity === "danger"
                                ? "bg-rose-600"
                                : item.severity === "warning"
                                ? "bg-amber-600"
                                : "bg-blue-600"
                            }`}
                          />
                          <span className="font-black text-xs">{item.title}</span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed font-medium pl-3.5">
                          {item.desc}
                        </p>
                      </div>
                      {item.actionTab && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(item.actionTab as any);
                            setShowNotificationCenterModal(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 shadow-xs font-black text-[11px] whitespace-nowrap hover:bg-slate-50 cursor-pointer text-slate-800 transition shrink-0"
                        >
                          Xem ngay ➔
                        </button>
                      )}
                    </div>
                  ))
                )
              ) : (
                /* TAB LỊCH SỬ THU CHI GẦN ĐÂY */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                    <span>Giao dịch thực tế gần nhất:</span>
                    <span>15 khoản mới nhất</span>
                  </div>
                  {flows.filter((f) => f.isActual).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Chưa có giao dịch thu chi nào được ghi nhận.
                    </div>
                  ) : (
                    flows
                      .filter((f) => f.isActual)
                      .slice(0, 15)
                      .map((flow) => (
                        <div
                          key={flow.id}
                          className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900">{flow.title}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                {flow.tag}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {flow.from} ➔ {flow.to} • {flow.date || flow.rawDate}
                            </span>
                          </div>
                          <span
                            className={`font-black text-xs sm:text-sm ${
                              flow.type === "income"
                                ? "text-emerald-600"
                                : flow.type === "expense"
                                ? "text-rose-600"
                                : "text-slate-800"
                            }`}
                          >
                            {flow.type === "income" ? "+" : flow.type === "expense" ? "-" : ""}
                            {flow.amount.toLocaleString("vi-VN")} ₫
                          </span>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {notifCenterTab === "alerts"
                  ? allSystemAlerts.length > 0
                    ? `Có ${allSystemAlerts.length} thông báo cảnh báo`
                    : "Hệ thống trạng thái tốt"
                  : `Tổng ${flows.filter((f) => f.isActual).length} khoản thu chi`}
              </span>
              <button
                type="button"
                onClick={() => setShowNotificationCenterModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO / SỬA KHOẢN VAY - MƯỢN (CHỦ NỢ & CON NỢ) */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  loanForm.role === "creditor" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  <Handshake className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#0C2C47]">
                  {editingLoan ? "SỬA KHOẢN VAY / MƯỢN" : "TẠO KHOẢN VAY / MƯỢN MỚI"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoanModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-4">
              {/* Chọn vai trò: Chủ Nợ hay Con Nợ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Vai Trò Của Bạn *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoanForm((prev) => ({ ...prev, role: "creditor", confirmedCreditor: true }))}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      loanForm.role === "creditor"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>🟢 Tôi Là Chủ Nợ (Cho Vay)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanForm((prev) => ({ ...prev, role: "debtor", confirmedDebtor: true }))}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      loanForm.role === "debtor"
                        ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>🔴 Tôi Là Con Nợ (Đi Vay)</span>
                  </button>
                </div>
              </div>

              {/* Tên khoản nợ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên / Mục Đích Khoản Nợ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Vay mua thiết bị, Cho anh Nam mượn..."
                  value={loanForm.title}
                  onChange={(e) => setLoanForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] text-xs font-medium"
                />
              </div>

              {/* Đối tác (Ai?) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Đối Tác (Ai?) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tên cá nhân, ngân hàng hoặc tổ chức đối tác..."
                  value={loanForm.partnerName}
                  onChange={(e) => setLoanForm((prev) => ({ ...prev, partnerName: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] text-xs font-medium"
                />
              </div>

              {/* MoBo liên kết */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tài Khoản MoBo Liên Kết
                </label>
                <select
                  value={loanForm.linkedVaultId}
                  onChange={(e) => setLoanForm((prev) => ({ ...prev, linkedVaultId: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] text-xs font-medium bg-white"
                >
                  <option value="">-- Chưa liên kết MoBo --</option>
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.balance.toLocaleString("vi-VN")} ₫)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {loanForm.role === "creditor"
                    ? "MoBo nguồn trích tiền cho vay và nhận tiền thu hồi về sau này"
                    : "MoBo tiếp nhận tiền vay và trích tiền thanh toán trả nợ sau này"}
                </p>
              </div>

              {/* Số tiền gốc (Bao nhiêu? Quy ước 1 = 1.000 VNĐ) */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black text-slate-800 uppercase">
                    Số Tiền Gốc (Quy ước: 1 = 1.000 VNĐ) *
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    1 = 1.000 VNĐ
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Gõ 20 = 20.000₫ | Gõ 50000 = 50 triệu..."
                    value={loanForm.amountUnits}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, amountUnits: e.target.value }))}
                    className="w-full p-2.5 pr-14 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] font-black text-base"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                    k VNĐ
                  </span>
                </div>
                {loanForm.amountUnits && !isNaN(parseFloat(loanForm.amountUnits)) && (
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-black text-emerald-800">
                    💰 Số tiền thực tế:{" "}
                    {Math.round(parseFloat(loanForm.amountUnits) * 1000).toLocaleString("vi-VN")} ₫
                  </div>
                )}
              </div>

              {/* Lãi suất & Thời hạn trả lãi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Loại Lãi Suất
                  </label>
                  <select
                    value={loanForm.interestType}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, interestType: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="none">Không tính lãi (0%)</option>
                    <option value="monthly">% / tháng</option>
                    <option value="yearly">% / năm</option>
                    <option value="fixed_sum">Tiền lãi cố định</option>
                  </select>
                </div>

                {loanForm.interestType !== "none" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Mức Lãi ({loanForm.interestType === "monthly" ? "%/tháng" : loanForm.interestType === "yearly" ? "%/năm" : "VNĐ"})
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ví dụ: 1.2"
                      value={loanForm.interestRate}
                      onChange={(e) => setLoanForm((prev) => ({ ...prev, interestRate: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                )}

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kỳ Hạn Trả Lãi
                  </label>
                  <select
                    value={loanForm.interestDueTerm}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, interestDueTerm: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="end_term">Cuối kỳ cùng tiền gốc</option>
                    <option value="monthly">Hàng tháng định kỳ</option>
                    <option value="quarterly">Hàng quý</option>
                    <option value="none">Không có lãi</option>
                  </select>
                </div>
              </div>

              {/* Lúc nào (Ngày bắt đầu) & Thời hạn gốc (Ngày đáo hạn) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày Bắt Đầu (Lúc nào?)
                  </label>
                  <input
                    type="date"
                    required
                    value={loanForm.startDate}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Hạn Trả Gốc (Đáo hạn)
                  </label>
                  <input
                    type="date"
                    value={loanForm.dueDate}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Xác nhận từ 2 phía */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="block text-xs font-black text-slate-800 uppercase">
                  Xác Nhận Đối Soát 2 Phía
                </span>
                <div className="flex items-center justify-between gap-4 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loanForm.confirmedCreditor}
                      onChange={(e) => setLoanForm((prev) => ({ ...prev, confirmedCreditor: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-bold text-slate-700">Chủ Nợ xác nhận</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loanForm.confirmedDebtor}
                      onChange={(e) => setLoanForm((prev) => ({ ...prev, confirmedDebtor: e.target.checked }))}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <span className="font-bold text-slate-700">Con Nợ xác nhận</span>
                  </label>
                </div>
              </div>

              {/* Tùy chọn đồng bộ MoBo ngay khi tạo */}
              {!editingLoan && loanForm.linkedVaultId && (
                <label className="flex items-start space-x-2 p-3 bg-blue-50/70 rounded-xl border border-blue-200 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={loanForm.syncMoBo}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, syncMoBo: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-black text-blue-950 block">
                      {loanForm.role === "creditor"
                        ? "Trừ tiền MoBo ngay (Xuất tiền cho vay thực tế)"
                        : "Cộng tiền vào MoBo ngay (Đã nhận tiền vay thực tế)"}
                    </span>
                    <span className="text-[11px] text-blue-800">
                      Tự động tạo dòng tiền (Flow) và biến động số dư MoBo tại ngày bắt đầu.
                    </span>
                  </div>
                </label>
              )}

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi Chú / Điều Khoản Hợp Đồng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú điều khoản trả góp, số tài khoản nhận tiền..."
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0C2C47] text-white font-black text-xs hover:bg-[#0C2C47]/90 shadow-md cursor-pointer"
                >
                  {editingLoan ? "Lưu Thay Đổi" : "Tạo Khoản Vay Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TRẢ NỢ / THU NỢ (QUY ƯỚC 1 = 1.000 VNĐ) */}
      {activePayingLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  activePayingLoan.role === "creditor" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#0C2C47]">
                  {activePayingLoan.role === "creditor" ? "THU HỒI NỢ VỀ MOBO" : "THANH TOÁN TRẢ NỢ TỪ MOBO"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePayingLoan(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayLoan} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khoản nợ:</span>
                  <span className="font-bold text-slate-900">{activePayingLoan.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đối tác:</span>
                  <span className="font-bold text-slate-900">{activePayingLoan.partnerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dư nợ còn lại:</span>
                  <span className="font-black text-rose-600 text-sm">
                    {activePayingLoan.remainingAmount.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              {/* Nhập số tiền trả (1=1k) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black text-slate-800 uppercase">
                    Số Tiền Thanh Toán (Quy ước 1 = 1.000 VNĐ) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayingAmountUnits((activePayingLoan.remainingAmount / 1000).toString())}
                    className="text-[10px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer"
                  >
                    Tất toán hết ({activePayingLoan.remainingAmount.toLocaleString("vi-VN")}₫)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Nhập số tiền..."
                    value={payingAmountUnits}
                    onChange={(e) => setPayingAmountUnits(e.target.value)}
                    className="w-full p-2.5 pr-14 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] font-black text-base"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                    k VNĐ
                  </span>
                </div>
                {payingAmountUnits && !isNaN(parseFloat(payingAmountUnits)) && (
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-black text-emerald-800">
                    Thực trả: {Math.round(parseFloat(payingAmountUnits) * 1000).toLocaleString("vi-VN")} ₫
                  </div>
                )}
              </div>

              {/* Chọn MoBo thực hiện */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {activePayingLoan.role === "creditor" ? "MoBo Nhận Tiền Thu Về" : "MoBo Trích Tiền Đi Trả"}
                </label>
                <select
                  value={payingVaultId}
                  onChange={(e) => setPayingVaultId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="">-- Không cập nhật MoBo (Chỉ ghi sổ) --</option>
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.balance.toLocaleString("vi-VN")} ₫)
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi Chú Đợt Trả
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trả đợt 1, thanh toán chuyển khoản..."
                  value={payingNote}
                  onChange={(e) => setPayingNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActivePayingLoan(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0C2C47] text-white font-black text-xs hover:bg-[#0C2C47]/90 shadow-md cursor-pointer"
                >
                  Xác Nhận Thanh Toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TẠO THỎA THUẬN KÝ ĐIỆN TỬ QUA ID LIÊN KẾT */}
      {/* ======================================================== */}
      {showAgreementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47]">
                    TẠO THỎA THUẬN KÝ ĐIỆN TỬ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sinh mã ID liên kết • 2 bên cùng ký tên Canvas • Tự import vào Sổ Vay Mượn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAgreementModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdAgreementResult ? (
              /* MÀN HÌNH SAU KHI TẠO THÀNH CÔNG: HIỂN THỊ LINK CHIA SẺ */
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-base">
                    Đã Khởi Tạo Thỏa Thuận Thành Công!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Mã định danh thỏa thuận duy nhất: <b className="text-emerald-950 font-black text-sm">{createdAgreementResult.id}</b>
                  </p>
                </div>

                {/* Khối chia sẻ link */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-800 uppercase block">
                    Đường Link Thỏa Thuận & Ký Điện Tử:
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/agreement/${createdAgreementResult.id}` : `/agreement/${createdAgreementResult.id}`}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/agreement/${createdAgreementResult.id}`;
                        navigator.clipboard.writeText(link);
                        setAgreementLinkCopied(true);
                        setTimeout(() => setAgreementLinkCopied(false), 2000);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs cursor-pointer shrink-0 flex items-center space-x-1"
                    >
                      {agreementLinkCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao Chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    💡 Hãy gửi link này cho đối tác (Chủ nợ hoặc Con nợ) qua Zalo/SMS. Khi cả hai bên cùng hoàn tất ký tên trên Canvas, thỏa thuận sẽ tự động import vào Sổ Vay & Mượn và tạo 2 bản lưu để tải về.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Đóng
                  </button>

                  <a
                    href={`/agreement/${createdAgreementResult.id}`}
                    target="_blank"
                    className="px-5 py-2 rounded-xl bg-[#0C2C47] text-white font-black text-xs hover:bg-[#12385b] shadow-xs cursor-pointer flex items-center space-x-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Mở Trang Ký Tên Ngay ➔</span>
                  </a>
                </div>
              </div>
            ) : (
              /* FORM NHẬP LIỆU THỎA THUẬN */
              <form onSubmit={handleCreateAgreement} className="space-y-4">
                {/* Vai trò người lập */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bạn Đang Là Bên Nào Trong Thỏa Thuận? *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAgreementForm((prev) => ({ ...prev, creatorRole: "creditor" }))}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                        agreementForm.creatorRole === "creditor"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>🟢 Tôi Là Bên Cho Vay (Chủ Nợ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgreementForm((prev) => ({ ...prev, creatorRole: "debtor" }))}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                        agreementForm.creatorRole === "debtor"
                          ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>🔴 Tôi Là Bên Vay (Con Nợ)</span>
                    </button>
                  </div>
                </div>

                {/* Tiêu đề mục đích */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mục Đích Thỏa Thuận Vay *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Vay vốn nhập hàng kinh doanh, Vay mua máy tính..."
                    value={agreementForm.title}
                    onChange={(e) => setAgreementForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] text-xs font-medium"
                  />
                </div>

                {/* Thông tin 2 Bên */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-black text-emerald-800 uppercase mb-1">
                      Họ Tên Bên A (Chủ Nợ) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Họ tên người cho vay..."
                      value={agreementForm.creditorName}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, creditorName: e.target.value }))}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                    <input
                      type="text"
                      placeholder="SĐT / CCCD (tùy chọn)"
                      value={agreementForm.creditorContact}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, creditorContact: e.target.value }))}
                      className="w-full p-1.5 rounded-lg border border-slate-200 text-[11px] font-medium bg-white mt-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-rose-800 uppercase mb-1">
                      Họ Tên Bên B (Con Nợ) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Họ tên người đi vay..."
                      value={agreementForm.debtorName}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, debtorName: e.target.value }))}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    />
                    <input
                      type="text"
                      placeholder="SĐT / CCCD (tùy chọn)"
                      value={agreementForm.debtorContact}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, debtorContact: e.target.value }))}
                      className="w-full p-1.5 rounded-lg border border-slate-200 text-[11px] font-medium bg-white mt-1.5"
                    />
                  </div>
                </div>

                {/* Số tiền gốc (1=1k) */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-black text-slate-800 uppercase">
                      Số Tiền Thỏa Thuận (Quy ước: 1 = 1.000 VNĐ) *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      1 = 1.000 VNĐ
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Ví dụ: 30000 = 30 triệu..."
                      value={agreementForm.amountUnits}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, amountUnits: e.target.value }))}
                      className="w-full p-2.5 pr-14 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0C2C47] font-black text-base"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                      k VNĐ
                    </span>
                  </div>
                  {agreementForm.amountUnits && !isNaN(parseFloat(agreementForm.amountUnits)) && (
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-black text-emerald-800">
                      💰 Số tiền thực tế:{" "}
                      {Math.round(parseFloat(agreementForm.amountUnits) * 1000).toLocaleString("vi-VN")} ₫
                    </div>
                  )}
                </div>

                {/* Lãi suất */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Loại Lãi Suất
                    </label>
                    <select
                      value={agreementForm.interestType}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, interestType: e.target.value as any }))}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                    >
                      <option value="none">Không tính lãi (0%)</option>
                      <option value="monthly">% / tháng</option>
                      <option value="yearly">% / năm</option>
                      <option value="fixed_sum">Lãi cố định</option>
                    </select>
                  </div>

                  {agreementForm.interestType !== "none" ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mức Lãi ({agreementForm.interestType === "monthly" ? "%/tháng" : agreementForm.interestType === "yearly" ? "%/năm" : "VNĐ"})
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ví dụ: 1.0"
                        value={agreementForm.interestRate}
                        onChange={(e) => setAgreementForm((prev) => ({ ...prev, interestRate: e.target.value }))}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Kỳ Hạn Lãi
                      </label>
                      <span className="block p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 font-semibold">
                        Không phát sinh lãi
                      </span>
                    </div>
                  )}
                </div>

                {/* Thời gian */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Ngày Bắt Đầu
                    </label>
                    <input
                      type="date"
                      required
                      value={agreementForm.startDate}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Ngày Đáo Hạn
                    </label>
                    <input
                      type="date"
                      value={agreementForm.dueDate}
                      onChange={(e) => setAgreementForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* MoBo liên kết */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    MoBo Liên Kết Giao Dịch Của Bạn
                  </label>
                  <select
                    value={agreementForm.linkedVaultId}
                    onChange={(e) => setAgreementForm((prev) => ({ ...prev, linkedVaultId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="">-- Chưa gán MoBo --</option>
                    {vaults.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.balance.toLocaleString("vi-VN")} ₫)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingAgreement}
                    className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-700 hover:bg-indigo-800 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingAgreement ? "Đang Khởi Tạo..." : "Tạo Thỏa Thuận & Lấy Link Ký"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XÓA KHOẢN VAY */}
      {loanToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Xóa Khoản Vay / Mượn?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa hợp đồng: <b>"{loanToDelete.title}"</b> của đối tác <b>{loanToDelete.partnerName}</b>?
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setLoanToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteLoan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
