"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
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
  Eye
} from "lucide-react";
import {
  playCoinSound,
  playCashCounterSound,
  playWarningAlertSound,
  playGoalReachedSound,
  playEventSound,
  stopAllSounds,
} from "@/lib/sound";

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
  const [activeTab, setActiveTab] = useState<
    "overview" | "vaults" | "flows" | "reconcile" | "obligations" | "pricing" | "forecast" | "reports" | "settings"
  >("overview");

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

  // Form Thêm Kho
  const [vaultForm, setVaultForm] = useState({
    name: "",
    type: "bank",
    balance: "",
    description: "",
    isLocked: false,
    lockedAmount: "",
  });

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

  // Submit Kho Chứa Mới
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.name) return alert("Vui lòng nhập tên kho");
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vaultForm,
          balance: parseFloat(vaultForm.balance) || 0,
          lockedAmount: parseFloat(vaultForm.lockedAmount) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVaultModal(false);
        setVaultForm({ name: "", type: "bank", balance: "", description: "", isLocked: false, lockedAmount: "" });
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi thêm kho: " + err.message);
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

  // CÔNG THỨC TÀI SẢN RÒNG (Nguyên tắc xuyên suốt toàn hệ thống)
  // Tài sản ròng = Tổng số dư các Kho + Nợ phải thu (người khác nợ mình) - Nợ phải trả (mình nợ người khác)
  const totalBalance = vaults.reduce((acc, v) => acc + (v.balance || 0), 0);
  const totalReceivable = obligations
    .filter((o) => o.type === "receivable" || o.role === "creditor")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalPayable = obligations
    .filter((o) => o.type === "payable" || o.role === "debtor")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalTax = obligations
    .filter((o) => o.type === "tax")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  
  const netWorth = totalBalance + totalReceivable - totalPayable;

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
  const isDebtExceeded = totalPayable > systemSettings.maxNegativeDebtAllowed;

  // 3. Ngưỡng tiền kho cho phép (cảnh báo kho nào có số dư dưới ngưỡng)
  const lowBalanceVaults = vaults.filter((v) => v.balance < systemSettings.minVaultBalanceAllowed);

  // 4. Mục tiêu tiết kiệm (Tính theo tổng tiền kho hoặc tài sản ròng)
  const savingsProgressPct = systemSettings.savingsGoalAmount > 0 
    ? Math.min(100, Math.round((totalBalance / systemSettings.savingsGoalAmount) * 100))
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
        actionTab: "settings",
      });
    });
  }

  // 2. Vượt ngưỡng âm nợ cho phép
  if (isDebtExceeded) {
    allSystemAlerts.push({
      id: "debt_exceeded",
      type: "debt",
      title: "CẢNH BÁO: Vượt ngưỡng âm nợ an toàn!",
      desc: `Tổng nợ phải trả là ${totalPayable.toLocaleString("vi-VN")} ₫ (vượt mức cho phép tối đa ${systemSettings.maxNegativeDebtAllowed.toLocaleString("vi-VN")} ₫)`,
      severity: "danger",
      actionTab: "obligations",
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
      actionTab: "vaults",
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
      actionTab: "reconcile",
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
      actionTab: "reconcile",
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
      actionTab: "obligations",
    });
  }

  return (
    <div className="space-y-6 pb-32 sm:pb-36 relative">
      {/* HEADER: TÀI SẢN RÒNG & TỔNG QUAN XUYÊN SUỐT */}
      <div className="bg-gradient-to-r from-[#0C2C47] to-[#163e63] rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-[#ABCBCA]/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#ABCBCA] font-bold">
              <Scale className="w-4 h-4 text-[#BF512C]" />
              <span>Chỉ số cốt lõi · Toàn hệ sinh thái Zmoney</span>
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-black tracking-tight text-white">
              {netWorth.toLocaleString("vi-VN")} ₫
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Tài sản ròng = Tổng Kho ({totalBalance.toLocaleString("vi-VN")}₫) + Nợ phải thu (+{totalReceivable.toLocaleString("vi-VN")}₫) − Nợ phải trả (-{totalPayable.toLocaleString("vi-VN")}₫)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/15">
              <div>
                <span className="text-[10px] text-slate-300 uppercase block font-semibold">Tổng Kho</span>
                <span className="text-sm sm:text-base font-bold text-white truncate block">
                  {totalBalance.toLocaleString("vi-VN")}₫
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#2E5749] bg-white/80 px-1 rounded uppercase font-bold inline-block">Phải thu (+)</span>
                <span className="text-sm sm:text-base font-bold text-[#ABCBCA] truncate block">
                  +{totalReceivable.toLocaleString("vi-VN")}₫
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#BF512C] bg-white/80 px-1 rounded uppercase font-bold inline-block">Phải trả (-)</span>
                <span className="text-sm sm:text-base font-bold text-[#DA9B2B] truncate block">
                  -{totalPayable.toLocaleString("vi-VN")}₫
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Cảnh báo ưu tiên & Ngưỡng kiểm soát hệ thống */}
        {(nearDueObligations.length > 0 || unverifiedReconciliations.length > 0 || isTaxFundShort || (systemSettings.enablePlannedNotice && upcomingPlannedFlows.length > 0) || isDebtExceeded || lowBalanceVaults.length > 0) && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2 text-xs">
            {/* Cảnh báo sự kiện dự chi/thu sắp diễn ra trong X ngày */}
            {systemSettings.enablePlannedNotice && upcomingPlannedFlows.map((f) => (
              <span
                key={f.id}
                className="bg-amber-400 text-amber-950 font-black px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-900" />
                <span>
                  Nhắc sự kiện: {f.title} ({f.amount.toLocaleString("vi-VN")}₫) - Ngày {f.date || f.rawDate}
                </span>
              </span>
            ))}

            {/* Cảnh báo vượt ngưỡng âm nợ */}
            {isDebtExceeded && (
              <span className="bg-rose-500 text-white font-black px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span>
                  VƯỢT NGƯỠNG ÂM NỢ ({totalPayable.toLocaleString("vi-VN")}₫ &gt; {systemSettings.maxNegativeDebtAllowed.toLocaleString("vi-VN")}₫)
                </span>
              </span>
            )}

            {/* Cảnh báo kho dưới ngưỡng tiền tối thiểu */}
            {lowBalanceVaults.map((v) => (
              <span key={v.id} className="bg-orange-500 text-white font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span>
                  Kho "{v.name}" dưới ngưỡng an toàn ({v.balance.toLocaleString("vi-VN")}₫ &lt; {systemSettings.minVaultBalanceAllowed.toLocaleString("vi-VN")}₫)
                </span>
              </span>
            ))}

            {nearDueObligations.map((o) => (
              <span key={o.id} className="bg-[#DA9B2B] text-slate-900 font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Nợ đến hạn: {o.title} ({o.amount.toLocaleString("vi-VN")}₫)</span>
              </span>
            ))}
            {unverifiedReconciliations.length > 0 && (
              <span className="bg-[#BF512C] text-white font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{unverifiedReconciliations.length} chênh lệch chưa rõ nguyên nhân cần đối chiếu</span>
              </span>
            )}
            {isTaxFundShort && (
              <span className="bg-[#DA9B2B] text-slate-900 font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Cảnh báo: Quỹ dự phòng thuế đang hụt so với ước tính {totalTax.toLocaleString("vi-VN")}₫</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* THANH ĐIỀU HƯỚNG TẦNG SITEMAP (Đầy đủ 7 mục) */}
      <div className="flex overflow-x-auto space-x-2 border-b border-[#ABCBCA] pb-2 text-xs sm:text-sm font-bold no-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "overview" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tổng Quan</span>
        </button>

        <button
          onClick={() => setActiveTab("vaults")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "vaults" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>1. Kho Chứa ({vaults.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("flows")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "flows" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>2. Dòng Chảy ({flows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reconcile")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "reconcile" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>2.6. Đối Chiếu Số Dư</span>
        </button>

        <button
          onClick={() => setActiveTab("obligations")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "obligations" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Nghĩa Vụ ({obligations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("pricing")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "pricing" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>4. Vốn & Hòa Vốn</span>
        </button>

        <button
          onClick={() => setActiveTab("forecast")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "forecast" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <LineChart className="w-4 h-4" />
          <span>5. Dự Báo Dòng Tiền</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "reports" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>6. Báo Cáo</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "settings" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>7. Cài Đặt</span>
        </button>
      </div>

      {/* NỘI DUNG TỪNG TAB THEO SITEMAP */}

      {/* TAB 1: TỔNG QUAN (TRANG CHỦ) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ĐÈN TÍN HIỆU: ĐỘ LIÊN TỤC GHI CHÉP THEO KHO CHỨA */}
          <div className="bg-white rounded-xl border border-[#ABCBCA] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#0C2C47]" />
                <h3 className="font-bold text-[#0C2C47] text-sm sm:text-base">
                  Chỉ số "Độ liên tục ghi chép" (Kỷ luật cập nhật dữ liệu)
                </h3>
              </div>
              <span className="text-xs text-slate-500">Quy tắc đèn giao thông 3 màu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {vaults.map((v) => {
                const days = v.daysInactive ?? 0;
                const statusColor =
                  days === 0
                    ? "bg-[#2E5749] text-white" // Xanh: Cập nhật hôm nay
                    : days <= 3
                    ? "bg-[#DA9B2B] text-slate-900" // Vàng: 1-3 ngày chưa ghi
                    : "bg-[#BF512C] text-white"; // Đỏ: > 3 ngày im lặng
                const statusLabel =
                  days === 0 ? "🟢 Hôm nay" : days <= 3 ? `🟡 ${days} ngày chưa ghi` : `🔴 ${days} ngày im lặng`;

                return (
                  <div key={v.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm block">{v.name}</span>
                      <span className="text-[11px] text-slate-500">{v.balance.toLocaleString("vi-VN")}₫</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ dòng tiền 30 ngày gần nhất / sắp tới */}
          <div className="bg-white rounded-xl border border-[#ABCBCA] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0C2C47] text-sm sm:text-base flex items-center space-x-2">
                <LineChart className="w-5 h-5 text-[#2E5749]" />
                <span>Biểu Đồ Dòng Tiền 30 Ngày Gần Nhất & Sắp Tới</span>
              </h3>
              <span className="text-xs text-slate-500">Mô phỏng thu/chi & dự kiến</span>
            </div>
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 pt-4 px-2 border-b border-slate-200">
              {[
                { day: "01/09", in: 15, out: 8, net: 7 },
                { day: "05/09", in: 12, out: 3, net: 9 },
                { day: "08/09", in: 25, out: 14, net: 11 },
                { day: "12/09", in: 5, out: 18, net: -13 },
                { day: "15/09", in: 30, out: 6, net: 24 },
                { day: "20/09", in: 8, out: 10, net: -2 },
                { day: "25/09", in: 20, out: 5, net: 15 },
                { day: "30/09", in: 10, out: 12, net: -2 },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-32">
                    <div
                      style={{ height: `${Math.min(100, bar.in * 3.2)}%` }}
                      className="w-2.5 sm:w-4 bg-[#2E5749] rounded-t transition-all hover:opacity-80"
                      title={`Thu: +${bar.in}tr`}
                    ></div>
                    <div
                      style={{ height: `${Math.min(100, bar.out * 3.2)}%` }}
                      className="w-2.5 sm:w-4 bg-[#BF512C] rounded-t transition-all hover:opacity-80"
                      title={`Chi: -${bar.out}tr`}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{bar.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 pt-1">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#2E5749] inline-block"></span>
                <span>Dòng tiền vào (Thu nhập)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#BF512C] inline-block"></span>
                <span>Dòng tiền ra (Chi phí / Nghĩa vụ)</span>
              </span>
            </div>
          </div>

          {/* 3 KHỐI NGUYÊN THỦY (Overview Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kho chứa preview */}
            <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-[#0C2C47] text-sm flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Kho Chứa ({vaults.length})</span>
                </h4>
                <button onClick={() => setActiveTab("vaults")} className="text-xs text-[#BF512C] font-semibold hover:underline">
                  Xem tất cả ➔
                </button>
              </div>
              <div className="space-y-2 flex-1">
                {vaults.slice(0, 4).map((v) => (
                  <div key={v.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between text-xs items-center">
                    <div>
                      <span className="font-bold text-slate-700 block">{v.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{v.type}</span>
                    </div>
                    <span className="font-black text-[#0C2C47]">{v.balance.toLocaleString("vi-VN")}₫</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dòng chảy preview */}
            <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-[#0C2C47] text-sm flex items-center space-x-1.5">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Dòng Chảy Gần Nhất ({flows.length})</span>
                </h4>
                <button onClick={() => setActiveTab("flows")} className="text-xs text-[#BF512C] font-semibold hover:underline">
                  Sổ ghi ➔
                </button>
              </div>
              <div className="space-y-2 flex-1">
                {flows.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between text-xs">
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-700 block truncate">{f.title}</span>
                      <span className="text-[10px] text-slate-400">{f.from} ➔ {f.to}</span>
                    </div>
                    <span className={`font-black whitespace-nowrap ${f.type === 'income' ? 'text-[#2E5749]' : f.type === 'expense' ? 'text-[#BF512C]' : 'text-[#0C2C47]'}`}>
                      {f.type === 'income' ? '+' : f.type === 'expense' ? '-' : ''}{f.amount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nghĩa vụ preview */}
            <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-[#0C2C47] text-sm flex items-center space-x-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Nghĩa Vụ & Thuế ({obligations.length})</span>
                </h4>
                <button onClick={() => setActiveTab("obligations")} className="text-xs text-[#BF512C] font-semibold hover:underline">
                  Chi tiết ➔
                </button>
              </div>
              <div className="space-y-2 flex-1">
                {obligations.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between text-xs">
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-700 block truncate">{o.title}</span>
                      <span className="text-[10px] text-slate-400">Hạn: {o.dueDate || 'Trong kỳ'}</span>
                    </div>
                    <span className={`font-black whitespace-nowrap ${o.type === 'receivable' ? 'text-[#2E5749]' : 'text-[#BF512C]'}`}>
                      {o.amount.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MỤC 1. KHO CHỨA (POOLS) */}
      {activeTab === "vaults" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg text-[#0C2C47]">1. Kho Chứa — Điểm Chứa Tiền</h3>
              <p className="text-xs text-slate-500">Ví cá nhân, quỹ kinh doanh, tài khoản ngân hàng, quỹ dự phòng thuế</p>
            </div>
            <button
              onClick={() => setShowVaultModal(true)}
              className="bg-[#0C2C47] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#0C2C47]/90 flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Tạo Kho Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaults.map((vault) => (
              <div key={vault.id} className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base">{vault.name}</span>
                      {vault.isLocked && (
                        <span className="bg-[#DA9B2B]/20 text-[#DA9B2B] text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Khóa quỹ thuế</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">{vault.desc || "Không có mô tả"}</span>
                  </div>
                  <span className="capitalize text-xs font-bold px-2.5 py-1 rounded bg-[#ABCBCA]/30 text-[#0C2C47]">
                    {vault.type}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Số dư hệ thống tính:</span>
                  <span className="text-xl font-black text-[#0C2C47]">
                    {vault.balance.toLocaleString("vi-VN")} ₫
                  </span>
                </div>

                {vault.isLocked && (
                  <div className="text-xs text-slate-500 flex justify-between bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span>Số tiền khóa dự phòng thuế:</span>
                    <span className="font-bold text-[#BF512C]">
                      {(vault.lockedAmount || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Cập nhật: {vault.lastRecordedAt || "Chưa có"}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedVaultDetail(vault)}
                      className="text-xs font-semibold text-[#0C2C47] hover:underline"
                    >
                      Chi tiết ➔
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVaultForReconcile(vault);
                        setReconcileForm({
                          actualBalance: vault.balance.toString(),
                          reason: "Đối chiếu kiểm đếm định kỳ",
                          assignAsFlow: false,
                          flowTag: "Chênh lệch đối chiếu",
                        });
                        setShowReconcileModal(true);
                      }}
                      className="text-xs font-bold text-[#BF512C] hover:underline flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đối chiếu số dư</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Chi tiết Một Kho Chứa (Mục 1.2) */}
          {selectedVaultDetail && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#ABCBCA] space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-lg font-black text-[#0C2C47]">{selectedVaultDetail.name}</h3>
                    <span className="text-xs text-slate-500">Chi tiết số dư & Dòng chảy liên quan</span>
                  </div>
                  <button onClick={() => setSelectedVaultDetail(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Số dư hiện tại:</span>
                    <span className="font-bold text-sm text-[#0C2C47]">{selectedVaultDetail.balance.toLocaleString("vi-VN")} ₫</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Loại kho:</span>
                    <span className="font-semibold capitalize text-slate-800">{selectedVaultDetail.type}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                    <span className="text-slate-600 font-semibold block">Dòng chảy gần đây của kho này:</span>
                    {flows.filter(f => f.fromVaultId === selectedVaultDetail.id || f.toVaultId === selectedVaultDetail.id).length === 0 ? (
                      <span className="text-slate-400 block">Chưa có dòng chảy nào</span>
                    ) : (
                      flows.filter(f => f.fromVaultId === selectedVaultDetail.id || f.toVaultId === selectedVaultDetail.id).slice(0, 4).map(f => (
                        <div key={f.id} className="flex justify-between py-1 border-b border-slate-200/60 last:border-none">
                          <span>{f.title} ({f.date})</span>
                          <span className="font-bold">{f.amount.toLocaleString("vi-VN")}₫</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedVaultDetail(null)}
                    className="px-4 py-2 bg-[#0C2C47] text-white rounded-lg text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MỤC 2. DÒNG CHẢY (FLOWS) */}
      {activeTab === "flows" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-black text-lg text-[#0C2C47]">2. Dòng Chảy — Sổ Ghi Chuyển Động Tiền</h3>
              <p className="text-xs text-slate-500">Mỗi giao dịch là một mũi tên nối 2 Kho chứa hoặc ra/vào ngoài hệ thống</p>
            </div>
            <button
              onClick={() => setShowQuickRecordModal(true)}
              className="bg-[#BF512C] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#BF512C]/90 flex items-center space-x-1.5 self-start sm:self-auto shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Ghi Dòng Chảy Mới</span>
            </button>
          </div>

          {/* Sổ Ghi Tổng Bộ Lọc Đa Chiều (Mục 2.2) */}
          <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center space-x-1">
                <SlidersHorizontal className="w-4 h-4 text-[#0C2C47]" />
                <span>2.2 Sổ ghi tổng — Bộ lọc đa chiều</span>
              </span>
              {(filterVault || filterTag || filterStatus !== "all" || filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterVault("");
                    setFilterTag("");
                    setFilterStatus("all");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="text-[#BF512C] hover:underline"
                >
                  Xóa toàn bộ lọc
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <select
                value={filterVault}
                onChange={(e) => setFilterVault(e.target.value)}
                className="p-2 rounded border border-slate-300 bg-white"
              >
                <option value="">-- Tất cả Kho chứa --</option>
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="p-2 rounded border border-slate-300 bg-white"
              >
                <option value="">-- Tất cả Nhãn --</option>
                <option value="Doanh thu">Doanh thu</option>
                <option value="Chi phí">Chi phí</option>
                <option value="Nội bộ">Nội bộ</option>
                <option value="Vận hành">Vận hành</option>
                <option value="Thu nợ">Thu nợ</option>
                <option value="Trả nợ">Trả nợ</option>
                <option value="Chênh lệch">Chênh lệch</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 rounded border border-slate-300 bg-white"
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="actual">Chỉ Thực tế (Actual)</option>
                <option value="planned">Chỉ Dự kiến (Planned)</option>
              </select>

              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="p-2 rounded border border-slate-300 bg-white"
                placeholder="Từ ngày"
              />
            </div>
          </div>

          {/* Truy vết vòng xoay vốn (Mục 2.3) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-[#0C2C47]">
              <Layers className="w-4 h-4 text-[#2E5749]" />
              <span>2.3 Truy vết vòng xoay vốn (Luồng luân chuyển tiền)</span>
            </div>
            <p className="text-slate-600">
              Ví dụ vòng xoay mẫu: Rút từ <strong>Tài Khoản MB Bank</strong> ➔ chuyển sang <strong>Ví Tiền Mặt</strong> ➔ Chi trả đối tác vật tư ➔ Thu tiền bán hàng hoàn về <strong>Tài Khoản MB Bank</strong>.
            </p>
          </div>

          {/* Danh sách Dòng chảy */}
          <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm divide-y divide-slate-100 overflow-hidden">
            {flows.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Chưa có dòng chảy nào khớp với bộ lọc
              </div>
            ) : (
              flows.map((flow) => (
                <div key={flow.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 text-sm">{flow.title}</span>
                      {!flow.isActual && (
                        <span className="bg-[#DA9B2B]/20 text-[#DA9B2B] text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Dự kiến (2.4)
                        </span>
                      )}
                      {flow.isReconcile && (
                        <span className="bg-[#BF512C]/20 text-[#BF512C] text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Điều chỉnh đối chiếu (2.6)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                      <span>{flow.from} ➔ {flow.to}</span>
                      <span>·</span>
                      <span>{flow.date}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                        {flow.tag}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span
                        className={`text-base font-black ${
                          flow.type === "income"
                            ? "text-[#2E5749]"
                            : flow.type === "expense"
                            ? "text-[#BF512C]"
                            : "text-[#0C2C47]"
                        }`}
                      >
                        {flow.type === "income" ? "+" : flow.type === "expense" ? "-" : ""}
                        {flow.amount.toLocaleString("vi-VN")} ₫
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        {flow.type}
                      </span>
                    </div>

                    {/* Nút Sửa & Xóa Flow */}
                    <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleOpenEditFlow(flow)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                        title="Sửa số liệu"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlowToDelete(flow)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MỤC 2.6. ĐỐI CHIẾU SỐ DƯ THỰC TẾ & ĐIỀU CHỈNH CHƯA RÕ NGUYÊN NHÂN */}
      {activeTab === "reconcile" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">2.6. Đối Chiếu Số Dư Thực Tế (Audit Kiểm Đếm)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Nguyên tắc thiết kế cốt lõi: <strong>Không bao giờ ghi đè số dư khi phát hiện chênh lệch</strong>. 
              Mọi chênh lệch giữa số tiền thực đếm được và hệ thống sẽ tự động sinh Dòng chảy <strong>"Điều chỉnh chưa rõ nguyên nhân"</strong> để bảo toàn dấu vết kiểm toán và dùng làm chỉ số cảnh báo kỷ luật ghi chép.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaults.map((vault) => (
              <div key={vault.id} className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{vault.name}</span>
                  <span className="text-xs text-slate-500">Hệ thống đang tính:</span>
                  <span className="text-base font-black text-[#0C2C47] block">
                    {vault.balance.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedVaultForReconcile(vault);
                    setReconcileForm({
                      actualBalance: vault.balance.toString(),
                      reason: "Đối chiếu kiểm đếm định kỳ",
                      assignAsFlow: false,
                      flowTag: "Chênh lệch đối chiếu",
                    });
                    setShowReconcileModal(true);
                  }}
                  className="bg-[#0C2C47] text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#0C2C47]/90"
                >
                  Nhập số thực đếm ➔
                </button>
              </div>
            ))}
          </div>

          {/* Danh sách "Điều chỉnh chưa rõ nguyên nhân" theo thời gian (Chỉ số cảnh báo kỷ luật) */}
          <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-[#0C2C47] flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-[#BF512C]" />
                <span>Danh sách "Điều chỉnh chưa rõ nguyên nhân" theo thời gian</span>
              </h4>
              <span className="text-xs text-slate-500">Thước đo kỷ luật ghi chép</span>
            </div>

            <div className="divide-y divide-slate-100">
              {reconciles.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Chưa có lịch sử đối chiếu nào được ghi nhận
                </div>
              ) : (
                reconciles.map((r) => (
                  <div key={r.id} className="py-3 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{r.vaultName}</span>
                        <span className="text-[10px] text-slate-400">{r.createdAt}</span>
                      </div>
                      <span className="text-slate-500 mt-0.5 block">Lý do: {r.reason}</span>
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">
                        Hành động: {r.actionTaken}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Chênh lệch:</span>
                      <span
                        className={`font-black text-sm ${
                          r.difference === 0
                            ? "text-[#2E5749]"
                            : r.difference > 0
                            ? "text-[#2E5749]"
                            : "text-[#BF512C]"
                        }`}
                      >
                        {r.difference > 0 ? "+" : ""}
                        {r.difference.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MỤC 3. NGHĨA VỤ (NỢ & THUẾ) */}
      {activeTab === "obligations" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">3. Quản Lý Nghĩa Vụ (Nợ & Thuế)</h3>
            <p className="text-xs text-slate-300">
              Nguyên tắc vàng: <strong>Mọi khoản nợ bắt buộc gắn rõ vai trò Chủ nợ (phải thu) hay Con nợ (phải trả)</strong> vì tác động ngược nhau lên tài sản ròng. Lãi vay không đổi nợ gốc mà là dòng chảy độc lập.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phải thu */}
            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-[#2E5749]">3.1 Nợ Phải Thu (Chủ nợ: +Tài sản)</span>
                <span className="text-xs font-bold text-[#2E5749]">+{totalReceivable.toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="space-y-2">
                {obligations.filter((o) => o.type === "receivable" || o.role === "creditor").map((o) => (
                  <div key={o.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{o.title}</span>
                      <span className="text-[#2E5749]">+{o.amount.toLocaleString("vi-VN")}₫</span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex justify-between">
                      <span>Đối tác: {o.partner}</span>
                      <span>Hạn: {o.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phải trả */}
            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-[#BF512C]">3.2 Nợ Phải Trả (Con nợ: -Tài sản)</span>
                <span className="text-xs font-bold text-[#BF512C]">-{totalPayable.toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="space-y-2">
                {obligations.filter((o) => o.type === "payable" || o.role === "debtor").map((o) => (
                  <div key={o.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{o.title}</span>
                      <span className="text-[#BF512C]">-{o.amount.toLocaleString("vi-VN")}₫</span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex justify-between">
                      <span>Lãi: {o.interest}</span>
                      <span className="text-[#DA9B2B] font-bold">Hạn: {o.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Thuế */}
            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-[#0C2C47]">3.3 Thuế Tính Theo Kỳ</span>
                <span className="text-xs font-bold text-[#0C2C47]">{totalTax.toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="space-y-2">
                {obligations.filter((o) => o.type === "tax").map((o) => (
                  <div key={o.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>{o.title}</span>
                      <span className="text-[#0C2C47]">{o.amount.toLocaleString("vi-VN")}₫</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {o.formula}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MỤC 4. VỐN, ĐỊNH GIÁ & ĐIỂM HÒA VỐN */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">4. Vốn, Định Giá Sản Phẩm & Điểm Hòa Vốn</h3>
            <p className="text-xs text-slate-300">
              Công cụ tính toán định giá theo chi phí, hòa vốn ngược và cảnh báo co hẹp biên lợi nhuận
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form nhập tham số */}
            <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm space-y-4">
              <h4 className="font-bold text-[#0C2C47] text-sm">4.3 Công cụ định giá sản phẩm / dịch vụ</h4>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm / Dịch vụ</label>
                <input
                  type="text"
                  value={pricingCalc.productName}
                  onChange={(e) => setPricingCalc({ ...pricingCalc, productName: e.target.value })}
                  className="w-full p-2 rounded border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chi phí biến đổi / đơn vị (VNĐ)</label>
                  <input
                    type="number"
                    value={pricingCalc.variableCost}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, variableCost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chi phí cố định phân bổ (VNĐ)</label>
                  <input
                    type="number"
                    value={pricingCalc.fixedCostAlloc}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, fixedCostAlloc: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sản lượng dự kiến bán (Đơn vị)</label>
                  <input
                    type="number"
                    value={pricingCalc.expectedUnits}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, expectedUnits: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Biên lợi nhuận mong muốn (%)</label>
                  <input
                    type="number"
                    value={pricingCalc.targetMarginPct}
                    onChange={(e) => setPricingCalc({ ...pricingCalc, targetMarginPct: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Kết quả phân tích */}
            <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm space-y-4 flex flex-col justify-between">
              <h4 className="font-bold text-[#0C2C47] text-sm">4.4 & 4.5 Kết quả Định Giá & Điểm Hòa Vốn</h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                  <span className="text-slate-600">Giá bán khuyến nghị (theo Margin {pricingCalc.targetMarginPct}%):</span>
                  <span className="font-black text-base text-[#2E5749]">
                    {Math.round(priceByMargin).toLocaleString("vi-VN")} ₫
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                  <span className="text-slate-600">Giá bán tối thiểu hòa vốn ngược:</span>
                  <span className="font-bold text-sm text-[#0C2C47]">
                    {Math.round(breakEvenPrice).toLocaleString("vi-VN")} ₫
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                  <span className="text-slate-600">Sản lượng hòa vốn vận hành tối thiểu:</span>
                  <span className="font-black text-sm text-[#BF512C]">
                    {breakEvenUnits} sản phẩm / kỳ
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#DA9B2B]" />
                <span>Cảnh báo: Nếu chi phí biến đổi tăng quá 15%, biên lợi nhuận thực tế sẽ giảm về dưới 20%.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MỤC 5. DỰ BÁO DÒNG TIỀN & KỊCH BẢN GIẢ LẬP */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">5. Dự Báo Dòng Tiền & Kịch Bản Giả Lập</h3>
            <p className="text-xs text-slate-300">
              Phát hiện sớm nguy cơ âm quỹ và thử nghiệm giải pháp (hoãn chi / thu nợ sớm / tăng giá)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bộ điều khiển giả lập */}
            <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm space-y-4">
              <h4 className="font-bold text-[#0C2C47] text-sm">5.2 Kịch bản giả lập (What-if)</h4>
              
              <div className="space-y-3 text-xs">
                <label className="flex items-center space-x-2 p-2 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulationParams.delayExpenses}
                    onChange={(e) => setSimulationParams({ ...simulationParams, delayExpenses: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Hoãn khoản nợ ICT 18.5tr sang tháng sau</span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulationParams.speedupReceivables}
                    onChange={(e) => setSimulationParams({ ...simulationParams, speedupReceivables: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Đẩy nhanh thu hồi nợ Zlink 30tr trước 5 ngày</span>
                </label>
              </div>
            </div>

            {/* Dự báo số dư 30 ngày */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#0C2C47] text-sm">5.1 Số dư dự kiến toàn mạng lưới trong 30 ngày tới</h4>
                <span className="text-xs font-bold text-[#2E5749]">
                  Điểm đáy an toàn: +124.500.000₫
                </span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                ✅ Không phát hiện điểm âm quỹ trong 30 ngày tới. Dòng tiền dự kiến luôn duy trì mức an toàn &gt; 100.000.000 ₫.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: MỤC 6. BÁO CÁO & PHÂN TÍCH */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg">6. Báo Cáo & Phân Tích Tài Chính</h3>
              <p className="text-xs text-slate-300">Tổng hợp thu/chi, doanh thu kênh bán và đối chiếu phục vụ kiểm toán</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-[#BF512C] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 hover:bg-[#BF512C]/90 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>In / Xuất PDF (6.4)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-2">
              <span className="text-xs text-slate-500 font-semibold block">6.1 Tổng Thu Nhập Đã Ghi</span>
              <span className="text-xl font-black text-[#2E5749]">
                {flows.filter(f => f.type === 'income').reduce((acc, f) => acc + f.amount, 0).toLocaleString("vi-VN")} ₫
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-2">
              <span className="text-xs text-slate-500 font-semibold block">6.1 Tổng Chi Phí Đã Ghi</span>
              <span className="text-xl font-black text-[#BF512C]">
                {flows.filter(f => f.type === 'expense').reduce((acc, f) => acc + f.amount, 0).toLocaleString("vi-VN")} ₫
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-2">
              <span className="text-xs text-slate-500 font-semibold block">6.3 Chênh lệch Chưa rõ nguyên nhân</span>
              <span className="text-xl font-black text-[#DA9B2B]">
                {reconciles.reduce((acc, r) => acc + Math.abs(r.difference), 0).toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: MỤC 7. CÀI ĐẶT HỆ THỐNG */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-[#0C2C47] text-white p-5 rounded-xl space-y-2">
            <h3 className="font-black text-lg">7. Cài Đặt Hệ Thống & Cảnh Báo</h3>
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
                    <h4 className="font-bold text-[#0C2C47] text-sm">7.3 Thông Báo Sự Kiện Dự Chi / Thu</h4>
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
                  <h4 className="font-bold text-[#0C2C47] text-sm">7.4 Ngưỡng Âm Nợ & Tiền Kho Cho Phép</h4>
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
                    <h4 className="font-black text-[#0C2C47] text-base">7.5 Mục Tiêu Tiết Kiệm & Quỹ Tích Lũy</h4>
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
                      7.2A Cài Đặt Thời Gian Cập Nhật Tài Chính
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
                        7.2B Cấu Hình Âm Thanh Thông Báo Đặc Quyền
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
                onClick={() => setShowNotificationCenterModal(true)}
                style={{
                  backgroundColor: allSystemAlerts.length > 0 ? "#b45309" : "#0C2C47",
                  color: "#ffffff",
                  borderColor: allSystemAlerts.length > 0 ? "#f59e0b" : "#1e3a5f",
                }}
                className={`relative group h-13 sm:h-15 rounded-2xl border-2 shadow-md shadow-black/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer hover:brightness-105 ${
                  allSystemAlerts.length > 0 ? "animate-pulse" : ""
                }`}
                title="Xem thông báo và cảnh báo hệ thống"
              >
                {/* Badge số lượng thông báo nổi bật */}
                {allSystemAlerts.length > 0 && (
                  <span className="absolute -top-2 -right-1 bg-rose-600 text-white font-black text-[11px] min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-lg animate-bounce">
                    {allSystemAlerts.length}
                  </span>
                )}
                <div className="p-1 rounded-full bg-black/25 shrink-0">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 stroke-[2.5]" />
                </div>
                <div className="text-left leading-none">
                  <span className="block font-black text-xs sm:text-sm tracking-wider text-white">BÁO</span>
                  <span className="block text-[8px] sm:text-[9px] font-bold text-amber-200 uppercase tracking-wider mt-0.5">
                    {allSystemAlerts.length > 0 ? `${allSystemAlerts.length} TIN` : "CHUÔNG"}
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

      {/* MODAL THÊM KHO MỚI (Mục 1.3) */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-[#0C2C47]">Thêm Kho Chứa Tiền Mới</h3>
              <button onClick={() => setShowVaultModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateVault} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên Kho</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Tài khoản ACB, Ví két sắt..."
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại</label>
                  <select
                    value={vaultForm.type}
                    onChange={(e) => setVaultForm({ ...vaultForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="bank">Ngân hàng (Bank)</option>
                    <option value="cash">Tiền mặt (Cash)</option>
                    <option value="ewallet">Ví điện tử (eWallet)</option>
                    <option value="reserve">Quỹ dự phòng (Reserve)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số dư ban đầu</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={vaultForm.balance}
                    onChange={(e) => setVaultForm({ ...vaultForm, balance: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isLocked"
                  checked={vaultForm.isLocked}
                  onChange={(e) => setVaultForm({ ...vaultForm, isLocked: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="isLocked" className="text-xs text-slate-700 font-semibold">
                  1.4 Cấu hình đặc biệt: Khóa một phần cho quỹ thuế
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#0C2C47] text-white text-xs font-black"
                >
                  Tạo Kho Chứa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  setActiveTab("reports");
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02] cursor-pointer"
              >
                📊 XEM BÁO CÁO & CHỐT SỔ NGAY ➔
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
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47] uppercase tracking-wide">
                    Trung Tâm Thông Báo Hệ Thống
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cảnh báo dự thu/chi, ngưỡng nợ, hạn mức kho & lịch báo cáo
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

            {/* Danh sách thông báo */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {allSystemAlerts.length === 0 ? (
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
                              ? "bg-rose-600 animate-pulse"
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
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {allSystemAlerts.length > 0
                  ? `Có ${allSystemAlerts.length} thông báo cần chú ý`
                  : "Hệ thống trạng thái tốt"}
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
    </div>
  );
}
