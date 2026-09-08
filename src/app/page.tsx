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
  ChevronRight
} from "lucide-react";

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

  // Tab điều hướng chính
  const [activeTab, setActiveTab] = useState<"overview" | "vaults" | "flows" | "obligations" | "reconcile">("overview");

  // Modals
  const [showQuickRecordModal, setShowQuickRecordModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedVaultForReconcile, setSelectedVaultForReconcile] = useState<Vault | null>(null);

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

  // Filter Sổ Ghi Tổng
  const [filterVault, setFilterVault] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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
      console.error("Lỗi fetch DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterVault, filterTag, filterStatus, filterStartDate, filterEndDate]);

  // Submit Kho Mới
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.name) return alert("Vui lòng nhập tên Kho");
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

  // Submit Đối Chiếu Số Dư
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

  // Cảnh báo ưu tiên
  const nearDueObligations = obligations.filter((o) => o.status === "urgent");
  const unverifiedReconciliations = reconciles.filter((r) => r.actionTaken.includes("chưa rõ"));

  return (
    <div className="space-y-6 pb-20 relative">
      {/* HEADER: TÀI SẢN RÒNG & TỔNG QUAN XUYÊN SUỐT */}
      <div className="bg-gradient-to-r from-[#0C2C47] to-[#163e63] rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-[#ABCBCA]/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#ABCBCA] font-bold">
              <Scale className="w-4 h-4 text-[#BF512C]" />
              <span>Chỉ số cốt lõi · Toàn hệ sinh thái</span>
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-black tracking-tight text-white">
              {netWorth.toLocaleString("vi-VN")} ₫
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Tài sản ròng = Tổng Kho ({totalBalance.toLocaleString("vi-VN")}₫) + Nợ phải thu (+{totalReceivable.toLocaleString("vi-VN")}₫) − Nợ phải trả (-{totalPayable.toLocaleString("vi-VN")}₫)
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={() => setShowQuickRecordModal(true)}
                className="bg-[#BF512C] hover:bg-[#BF512C]/90 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ GHI NHANH GIAO DỊCH</span>
              </button>
            </div>
          </div>

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

        {/* Thanh cảnh báo ưu tiên */}
        {(nearDueObligations.length > 0 || unverifiedReconciliations.length > 0) && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2 text-xs">
            {nearDueObligations.map((o) => (
              <span key={o.id} className="bg-[#DA9B2B] text-slate-900 font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Khoản nợ sắp đến hạn: {o.title} ({o.amount.toLocaleString("vi-VN")}₫)</span>
              </span>
            ))}
            {unverifiedReconciliations.length > 0 && (
              <span className="bg-[#BF512C] text-white font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{unverifiedReconciliations.length} chênh lệch chưa rõ nguyên nhân cần đối chiếu</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* THANH ĐIỀU HƯỚNG TẦNG SITEMAP */}
      <div className="flex overflow-x-auto space-x-2 border-b border-[#ABCBCA] pb-2 text-xs sm:text-sm font-bold no-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition flex items-center space-x-1.5 ${
            activeTab === "overview" ? "bg-[#0C2C47] text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tổng Quan Sơ Đồ</span>
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
      </div>

      {/* NỘI DUNG TỪNG TAB THEO SITEMAP */}

      {/* TAB 1: TỔNG QUAN TOÀN HỆ THỐNG */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* ĐÈN TÍN HIỆU: ĐỘ LIÊN TỤC GHI CHÉP THEO KHO CHỨA */}
          <div className="bg-white rounded-xl border border-[#ABCBCA] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#0C2C47]" />
                <h3 className="font-bold text-[#0C2C47] text-sm sm:text-base">
                  Chỉ số "Độ liên tục ghi chép" (Kỷ luật cập nhật)
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
                {vaults.slice(0, 3).map((v) => (
                  <div key={v.id} className="p-2.5 bg-slate-50 rounded border border-slate-100 flex justify-between text-xs">
                    <span className="font-bold text-slate-700">{v.name}</span>
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
                {flows.slice(0, 3).map((f) => (
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
                {obligations.slice(0, 3).map((o) => (
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
            <h3 className="font-black text-lg text-[#0C2C47]">1. Danh Sách Kho Chứa Tiền</h3>
            <button
              onClick={() => setShowVaultModal(true)}
              className="bg-[#0C2C47] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#0C2C47]/90 flex items-center space-x-1"
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
                          <span>Đã khóa quỹ thuế</span>
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
                  <div className="text-xs text-slate-500 flex justify-between bg-slate-50 p-2 rounded">
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
                    className="text-xs font-bold text-[#BF512C] hover:underline flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đối chiếu số dư thực tế</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MỤC 2. DÒNG CHẢY (FLOWS) */}
      {activeTab === "flows" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="font-black text-lg text-[#0C2C47]">2. Sổ Ghi Tổng Chuyển Động Tiền</h3>
            <button
              onClick={() => setShowQuickRecordModal(true)}
              className="bg-[#BF512C] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#BF512C]/90 flex items-center space-x-1 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Ghi Dòng Chảy Mới</span>
            </button>
          </div>

          {/* Sổ Ghi Tổng Bộ Lọc (Mục 2.2) */}
          <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center space-x-1">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Bộ lọc đa chiều (Kho / Nhãn / Trạng thái / Ngày)</span>
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
                          Dự kiến
                        </span>
                      )}
                      {flow.isReconcile && (
                        <span className="bg-[#BF512C]/20 text-[#BF512C] text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Điều chỉnh đối chiếu
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
              Nguyên tắc thiết kế: <strong>Không bao giờ ghi đè số dư khi phát hiện chênh lệch</strong>. 
              Mọi chênh lệch giữa số tiền thực đếm được và hệ thống sẽ được lưu giữ dấu vết bằng Dòng chảy "Điều chỉnh chưa rõ nguyên nhân" để tránh mất khả năng truy nguyên sau này.
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
                <span>Nhật Ký Đối Chiếu & Chênh Lệch Chưa Rõ Nguyên Nhân</span>
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
                        Xử lý: {r.actionTaken}
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
              Bắt buộc gắn rõ vai trò: <strong>Chủ nợ (Phải thu - cộng vào tài sản)</strong> hay <strong>Con nợ (Phải trả - trừ khỏi tài sản)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phải thu */}
            <div className="bg-white p-4 rounded-xl border border-[#ABCBCA] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-[#2E5749]">3.1 Nợ Phải Thu (Người khác nợ mình)</span>
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
                <span className="font-bold text-sm text-[#BF512C]">3.2 Nợ Phải Trả (Mình nợ người khác)</span>
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

      {/* NÚT GHI NHANH NỔI (FLOATING ACTION BUTTON - FAB) TOÀN CỤC */}
      <button
        onClick={() => setShowQuickRecordModal(true)}
        className="fixed bottom-6 right-6 z-[9999] bg-[#BF512C] text-white px-5 py-3.5 rounded-full shadow-[0_10px_25px_rgba(191,81,44,0.5)] border-2 border-white hover:bg-[#BF512C]/90 flex items-center space-x-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        title="Ghi nhanh giao dịch dòng chảy mới"
      >
        <PlusCircle className="w-6 h-6 animate-pulse" />
        <span className="font-black text-sm tracking-wide">Ghi Nhanh</span>
      </button>

      {/* MODAL GHI NHANH GIAO DỊCH */}
      {showQuickRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-[#BF512C]" />
                <h3 className="text-lg font-black text-[#0C2C47]">Ghi Nhanh Chuyển Động Tiền</h3>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại</label>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nhãn phân loại</label>
                  <input
                    type="text"
                    value={flowForm.tag}
                    onChange={(e) => setFlowForm({ ...flowForm, tag: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                    placeholder="Vd: Doanh thu, Ăn uống..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái</label>
                  <select
                    value={flowForm.isActual ? "actual" : "planned"}
                    onChange={(e) => setFlowForm({ ...flowForm, isActual: e.target.value === "actual" })}
                    className="w-full p-2 rounded border border-slate-300 text-xs"
                  >
                    <option value="actual">Thực tế phát sinh (Trừ/Cộng tiền ngay)</option>
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
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

      {/* MODAL THÊM KHO MỚI */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
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
                  Kho đặc biệt: Khóa một phần cho quỹ thuế
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
    </div>
  );
}
