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
  CheckCircle2
} from "lucide-react";

interface Vault {
  id: string;
  name: string;
  type: string;
  balance: number;
  desc?: string;
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
  date: string;
}

interface Obligation {
  id: string;
  title: string;
  type: "receivable" | "payable" | "tax";
  amount: number;
  partner?: string;
  formula?: string;
  interest?: string;
  dueDate?: string;
  status: string;
}

export default function Home() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab điều hướng trên Mobile
  const [activeMobileTab, setActiveMobileTab] = useState<"all" | "vaults" | "flows" | "obligations">("all");

  // Modal State
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);

  // Form Thêm Kho
  const [vaultForm, setVaultForm] = useState({
    name: "",
    type: "bank",
    balance: "",
    description: "",
  });

  // Form Thêm Giao Dịch Dòng Chảy
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

  // Bộ lọc Sổ Ghi Tổng
  const [filterVault, setFilterVault] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Vaults
      const vRes = await fetch("/api/vaults");
      const vData = await vRes.json();
      if (vData.success) setVaults(vData.data);

      // 2. Flows (với filter query)
      const queryParams = new URLSearchParams();
      if (filterVault) queryParams.append("vaultId", filterVault);
      if (filterTag) queryParams.append("tag", filterTag);
      if (filterStartDate) queryParams.append("startDate", filterStartDate);
      if (filterEndDate) queryParams.append("endDate", filterEndDate);

      const fRes = await fetch(`/api/flows?${queryParams.toString()}`);
      const fData = await fRes.json();
      if (fData.success) setFlows(fData.data);

      // 3. Obligations
      const oRes = await fetch("/api/obligations");
      const oData = await oRes.json();
      if (oData.success) setObligations(oData.data);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu từ DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterVault, filterTag, filterStartDate, filterEndDate]);

  // Submit Thêm Kho Chứa
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.name) return alert("Vui lòng nhập tên Kho chứa");
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vaultForm,
          balance: parseFloat(vaultForm.balance) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowVaultModal(false);
        setVaultForm({ name: "", type: "bank", balance: "", description: "" });
        await fetchData();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi thêm kho: " + err.message);
    }
  };

  // Submit Tạo Dòng Chảy
  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(flowForm.amount);
    if (!flowForm.title || isNaN(amount) || amount <= 0) {
      return alert("Vui lòng nhập tiêu đề và số tiền hợp lệ (> 0)");
    }

    // Tự động suy ra fromTitle / toTitle theo vault đã chọn
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
        setShowFlowModal(false);
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
      alert("Lỗi khi tạo giao dịch: " + err.message);
    }
  };

  const totalBalance = vaults.reduce((acc, v) => acc + (v.balance || 0), 0);
  const totalReceivable = obligations
    .filter((o) => o.type === "receivable")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalPayable = obligations
    .filter((o) => o.type === "payable")
    .reduce((acc, o) => acc + (o.amount || 0), 0);
  const totalTax = obligations
    .filter((o) => o.type === "tax")
    .reduce((acc, o) => acc + (o.amount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight">Tổng các Kho</span>
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E5749]" />
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-black text-[#0C2C47] tracking-tight truncate">
            {totalBalance.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 flex items-center text-[10px] sm:text-xs text-[#2E5749] font-medium">
            <TrendingUp className="w-3 h-3 mr-1" />
            {vaults.length} Kho chứa hoạt động
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight">Nợ Phải Thu</span>
            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E5749]" />
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-black text-[#2E5749] tracking-tight truncate">
            +{totalReceivable.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 text-[10px] sm:text-xs text-slate-500">
            Dự kiến thu hồi
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight">Nợ Phải Trả</span>
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#BF512C]" />
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-black text-[#BF512C] tracking-tight truncate">
            -{totalPayable.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 flex items-center text-[10px] sm:text-xs text-[#DA9B2B] font-medium truncate">
            <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
            Nghĩa vụ ra
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight">Ước tính Thuế</span>
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0C2C47]" />
          </div>
          <p className="mt-2 text-lg sm:text-2xl font-black text-[#0C2C47] tracking-tight truncate">
            {totalTax.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 text-[10px] sm:text-xs text-slate-500">
            Theo kỳ doanh thu
          </div>
        </div>
      </div>

      {/* Mobile Tabs Navigation (Chỉ hiện trên màn hình nhỏ) */}
      <div className="flex lg:hidden rounded-lg bg-slate-200 p-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveMobileTab("all")}
          className={`flex-1 py-1.5 rounded-md transition ${activeMobileTab === "all" ? "bg-white text-[#0C2C47] shadow-sm" : ""}`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveMobileTab("vaults")}
          className={`flex-1 py-1.5 rounded-md transition ${activeMobileTab === "vaults" ? "bg-white text-[#0C2C47] shadow-sm" : ""}`}
        >
          Kho ({vaults.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("flows")}
          className={`flex-1 py-1.5 rounded-md transition ${activeMobileTab === "flows" ? "bg-white text-[#0C2C47] shadow-sm" : ""}`}
        >
          Dòng chảy ({flows.length})
        </button>
        <button
          onClick={() => setActiveMobileTab("obligations")}
          className={`flex-1 py-1.5 rounded-md transition ${activeMobileTab === "obligations" ? "bg-white text-[#0C2C47] shadow-sm" : ""}`}
        >
          Nghĩa vụ ({obligations.length})
        </button>
      </div>

      {/* 3 KHỐI DỮ LIỆU NỀN TẢNG (Responsive Grid: 1 cột mobile, 3 cột desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KHỐI 1: KHO CHỨA */}
        <div className={`bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col ${activeMobileTab !== "all" && activeMobileTab !== "vaults" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">1. Kho Chứa ({vaults.length})</h2>
            </div>
            <button
              onClick={() => setShowVaultModal(true)}
              className="text-xs bg-[#0C2C47] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#0C2C47]/90 font-semibold flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Thêm Kho</span>
            </button>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                onClick={() => setFilterVault(filterVault === vault.id ? "" : vault.id)}
                className={`p-3.5 rounded-lg border transition cursor-pointer ${
                  filterVault === vault.id
                    ? "border-[#0C2C47] bg-slate-100 ring-2 ring-[#0C2C47]/20"
                    : "border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{vault.name}</span>
                  <span className="font-black text-[#0C2C47] text-sm">
                    {vault.balance.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
                  <span className="truncate mr-2">{vault.desc || "Không có mô tả"}</span>
                  <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-[#ABCBCA]/40 text-[#0C2C47] font-semibold flex-shrink-0">
                    {vault.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KHỐI 2: DÒNG CHẢY */}
        <div className={`bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col ${activeMobileTab !== "all" && activeMobileTab !== "flows" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">2. Dòng Chảy ({flows.length})</h2>
            </div>
            <button
              onClick={() => setShowFlowModal(true)}
              className="text-xs bg-[#BF512C] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#BF512C]/90 font-semibold flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Tạo Giao Dịch</span>
            </button>
          </div>

          {/* Sổ Ghi Tổng Filter Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-semibold">
              <span className="flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Bộ lọc Sổ ghi:</span>
              </span>
              {(filterVault || filterTag || filterStartDate || filterEndDate) && (
                <button
                  onClick={() => {
                    setFilterVault("");
                    setFilterTag("");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="text-[#BF512C] hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterVault}
                onChange={(e) => setFilterVault(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-300 bg-white text-xs"
              >
                <option value="">-- Lọc theo Kho --</option>
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full p-1.5 rounded border border-slate-300 bg-white text-xs"
              >
                <option value="">-- Lọc theo Nhãn --</option>
                <option value="Doanh thu">Doanh thu</option>
                <option value="Nội bộ">Nội bộ</option>
                <option value="Vận hành">Vận hành</option>
                <option value="Thu nợ">Thu nợ</option>
                <option value="Chi phí">Chi phí</option>
              </select>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-3 max-h-[550px] overflow-y-auto">
            {flows.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Không tìm thấy giao dịch nào phù hợp bộ lọc
              </div>
            ) : (
              flows.map((flow) => (
                <div key={flow.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA] transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-sm line-clamp-1">{flow.title}</span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {flow.from} ➔ {flow.to}
                      </div>
                    </div>
                    <span
                      className={`font-black text-sm whitespace-nowrap ${
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
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{flow.date}</span>
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {flow.tag || flow.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KHỐI 3: NGHĨA VỤ */}
        <div className={`bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col ${activeMobileTab !== "all" && activeMobileTab !== "obligations" ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">3. Nghĩa Vụ ({obligations.length})</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Nợ & Thuế kỳ</span>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {obligations.map((ob) => (
              <div key={ob.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm line-clamp-1">{ob.title}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Đối tác: {ob.partner}
                    </div>
                  </div>
                  <span
                    className={`font-black text-sm whitespace-nowrap ${
                      ob.type === "receivable" ? "text-[#2E5749]" : "text-[#BF512C]"
                    }`}
                  >
                    {ob.amount.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {ob.formula ? `CT: ${ob.formula}` : `Lãi: ${ob.interest}`}
                  </span>
                  <span
                    className={`font-medium text-[11px] px-1.5 py-0.5 rounded flex items-center ${
                      ob.status === "urgent"
                        ? "bg-[#DA9B2B]/20 text-[#BF512C] font-semibold"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Hạn: {ob.dueDate || "Trong kỳ"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL 1: THÊM KHO CHỨA */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0C2C47]">Thêm Kho Chứa Mới</h3>
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
                  placeholder="Vd: Ngân hàng VCB, Két tiền mặt..."
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại</label>
                  <select
                    value={vaultForm.type}
                    onChange={(e) => setVaultForm({ ...vaultForm, type: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
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
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả / Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú sử dụng"
                  value={vaultForm.description}
                  onChange={(e) => setVaultForm({ ...vaultForm, description: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0C2C47] text-white text-sm font-bold hover:bg-[#0C2C47]/90"
                >
                  Lưu vào DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO GIAO DỊCH DÒNG CHẢY */}
      {showFlowModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#ABCBCA] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0C2C47]">Tạo Giao Dịch Dòng Chảy</h3>
              <button onClick={() => setShowFlowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFlow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu đề giao dịch</label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Nhận tiền thanh toán, Chuyển tiền vào két..."
                  value={flowForm.title}
                  onChange={(e) => setFlowForm({ ...flowForm, title: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại giao dịch</label>
                  <select
                    value={flowForm.type}
                    onChange={(e) => setFlowForm({ ...flowForm, type: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0C2C47]"
                  >
                    <option value="expense">Chi tiền (Expense)</option>
                    <option value="income">Thu tiền (Income)</option>
                    <option value="transfer">Chuyển nội bộ 2 Kho (Transfer)</option>
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
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold text-[#0C2C47] focus:outline-none focus:border-[#0C2C47]"
                  />
                </div>
              </div>

              {/* Nguồn / Đích Kho Chứa */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {flowForm.type !== "income" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kho Nguồn (Trừ tiền)</label>
                    <select
                      value={flowForm.fromVaultId}
                      onChange={(e) => setFlowForm({ ...flowForm, fromVaultId: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Chọn Kho --</option>
                      {vaults.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.balance.toLocaleString("vi-VN")}₫)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Từ Đối Tác / Khách</label>
                    <input
                      type="text"
                      placeholder="Vd: Khách hàng X..."
                      value={flowForm.fromTitle}
                      onChange={(e) => setFlowForm({ ...flowForm, fromTitle: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    />
                  </div>
                )}

                {flowForm.type !== "expense" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kho Đích (Cộng tiền)</label>
                    <select
                      value={flowForm.toVaultId}
                      onChange={(e) => setFlowForm({ ...flowForm, toVaultId: e.target.value })}
                      className="w-full p-2 rounded border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Chọn Kho --</option>
                      {vaults.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.balance.toLocaleString("vi-VN")}₫)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đến Nhà Cung Cấp / Mục đích</label>
                    <input
                      type="text"
                      placeholder="Vd: Mua văn phòng phẩm..."
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
                    placeholder="Vd: Doanh thu, Chi phí..."
                    value={flowForm.tag}
                    onChange={(e) => setFlowForm({ ...flowForm, tag: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày giao dịch</label>
                  <input
                    type="date"
                    value={flowForm.flowDate}
                    onChange={(e) => setFlowForm({ ...flowForm, flowDate: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFlowModal(false)}
                  className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#BF512C] text-white text-sm font-bold hover:bg-[#BF512C]/90"
                >
                  Ghi Dòng Chảy & Cập nhật Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
