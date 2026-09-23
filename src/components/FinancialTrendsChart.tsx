"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  DollarSign,
  Scale,
  Sparkles,
  Info,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";

export interface FlowItem {
  id: string;
  amount: number;
  type: "income" | "expense" | "transfer" | string;
  isActual: boolean;
  date?: string; // DD/MM/YYYY
  rawDate?: string; // YYYY-MM-DD
}

export interface LoanItem {
  id: string;
  role: "creditor" | "debtor" | string;
  amount: number;
  remainingAmount?: number;
  status: string;
  startDate?: string;
  dueDate?: string | null;
}

export interface VaultItem {
  id: string;
  name: string;
  balance: number;
  type: string;
}

export interface FinancialTrendsChartProps {
  flows: FlowItem[];
  loans: LoanItem[];
  vaults: VaultItem[];
}

type TimeframeMode = "recent" | "six_months" | "year";

interface DataPoint {
  label: string; // Tên hiển thị trên trục X (VD: "18/09" hoặc "T9/26")
  fullDate: string; // YYYY-MM-DD hoặc YYYY-MM
  isToday?: boolean;
  actualIncome: number;
  actualExpense: number;
  plannedIncome: number;
  plannedExpense: number;
  debtAmount: number;
}

export default function FinancialTrendsChart({
  flows,
  loans,
  vaults,
}: FinancialTrendsChartProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeMode>("recent");
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  // Trạng thái bật/tắt hiển thị từng đường biểu đồ
  const [visibleSeries, setVisibleSeries] = useState({
    actualIncome: true,
    actualExpense: true,
    plannedIncome: true,
    plannedExpense: true,
    debt: true,
  });

  // Chế độ thang đo cột tiền trục Y:
  // "auto": Tự động theo toàn bộ dữ liệu đang bật (kể cả Nợ)
  // "focus_flows": Phóng to các dòng Thu/Chi/Dự thu/Dự chi (loại trừ Nợ để thấy rõ từng khoản nhỏ 100k, 250k)
  // "custom": Người dùng tự chọn mức trần hoặc kéo thanh zoom
  const [scaleMode, setScaleMode] = useState<"auto" | "focus_flows" | "custom">("auto");
  const [customMaxY, setCustomMaxY] = useState<number>(1000000);

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper chuyển đổi chuỗi ngày thành YYYY-MM-DD
  const parseToISODate = (flow: FlowItem): string | null => {
    if (flow.rawDate && /^\d{4}-\d{2}-\d{2}/.test(flow.rawDate)) {
      return flow.rawDate.slice(0, 10);
    }
    if (flow.date && flow.date.includes("/")) {
      const parts = flow.date.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return null;
  };

  // Tổng nợ hiện tại: nợ ngân hàng thấu chi (vault balance âm) + nợ cá nhân active
  const currentBankDebt = Math.abs(
    vaults.filter((v) => v.balance < 0).reduce((acc, v) => acc + v.balance, 0)
  );
  const currentPeerDebt = loans
    .filter((l) => l.role === "debtor" && l.status === "active")
    .reduce((acc, l) => acc + (l.remainingAmount ?? l.amount), 0);
  const currentTotalDebt = currentBankDebt + currentPeerDebt;

  // ========================================================
  // XÂY DỰNG CHUỖI THỜI GIAN THEO CHẾ ĐỘ TIMEFRAME
  // ========================================================
  const chartData = useMemo<DataPoint[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    const points: DataPoint[] = [];

    if (timeframe === "recent") {
      // 30 ngày qua + 14 ngày tới (Tổng 45 mốc ngày, hiển thị các mốc cách nhau 3 ngày hoặc theo ngày)
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 25);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 15);

      const cur = new Date(startDate);
      while (cur <= endDate) {
        const iso = cur.toISOString().slice(0, 10);
        const day = cur.getDate().toString().padStart(2, "0");
        const month = (cur.getMonth() + 1).toString().padStart(2, "0");
        const label = `${day}/${month}`;
        const isToday = iso === todayISO;

        points.push({
          label,
          fullDate: iso,
          isToday,
          actualIncome: 0,
          actualExpense: 0,
          plannedIncome: 0,
          plannedExpense: 0,
          debtAmount: currentTotalDebt, // Mặc định nền tảng nợ
        });

        cur.setDate(cur.getDate() + 1);
      }

      // Điền dữ liệu flows vào từng ngày
      flows.forEach((f) => {
        const iso = parseToISODate(f);
        if (!iso) return;
        const pt = points.find((p) => p.fullDate === iso);
        if (pt) {
          const isInc = f.type === "income" || f.type === "in";
          const isExp = f.type === "expense" || f.type === "out";
          if (f.isActual) {
            if (isInc) pt.actualIncome += f.amount;
            if (isExp) pt.actualExpense += f.amount;
          } else {
            if (isInc) pt.plannedIncome += f.amount;
            if (isExp) pt.plannedExpense += f.amount;
          }
        }
      });

      // Điều chỉnh diễn biến nợ theo các khoản vay đến hạn trong tương lai
      loans
        .filter((l) => l.role === "debtor" && l.status === "active" && l.dueDate)
        .forEach((l) => {
          const dueISO = (l.dueDate || "").slice(0, 10);
          points.forEach((p) => {
            // Sau ngày đáo hạn nếu trả nợ sẽ giảm nợ dự kiến
            if (p.fullDate >= dueISO) {
              p.debtAmount = Math.max(0, p.debtAmount - (l.remainingAmount ?? l.amount) * 0.3);
            }
          });
        });

      return points;
    } else if (timeframe === "six_months") {
      // 6 tháng gần nhất: 5 tháng trước + tháng hiện tại
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const key = `${y}-${m}`;
        const label = `T${d.getMonth() + 1}/${y.toString().slice(2)}`;
        const isCurrentMonth = i === 0;

        points.push({
          label,
          fullDate: key,
          isToday: isCurrentMonth,
          actualIncome: 0,
          actualExpense: 0,
          plannedIncome: 0,
          plannedExpense: 0,
          debtAmount: currentTotalDebt,
        });
      }

      // Điền dữ liệu flows theo tháng
      flows.forEach((f) => {
        const iso = parseToISODate(f);
        if (!iso) return;
        const monthKey = iso.slice(0, 7);
        const pt = points.find((p) => p.fullDate === monthKey);
        if (pt) {
          const isInc = f.type === "income" || f.type === "in";
          const isExp = f.type === "expense" || f.type === "out";
          if (f.isActual) {
            if (isInc) pt.actualIncome += f.amount;
            if (isExp) pt.actualExpense += f.amount;
          } else {
            if (isInc) pt.plannedIncome += f.amount;
            if (isExp) pt.plannedExpense += f.amount;
          }
        }
      });

      return points;
    } else {
      // Cả năm nay: 12 tháng từ T1 đến T12
      const curYear = today.getFullYear();
      for (let m = 1; m <= 12; m++) {
        const mStr = m.toString().padStart(2, "0");
        const key = `${curYear}-${mStr}`;
        const label = `T${m}`;
        const isCurrentMonth = m === today.getMonth() + 1;

        points.push({
          label,
          fullDate: key,
          isToday: isCurrentMonth,
          actualIncome: 0,
          actualExpense: 0,
          plannedIncome: 0,
          plannedExpense: 0,
          debtAmount: currentTotalDebt,
        });
      }

      flows.forEach((f) => {
        const iso = parseToISODate(f);
        if (!iso) return;
        const monthKey = iso.slice(0, 7);
        const pt = points.find((p) => p.fullDate === monthKey);
        if (pt) {
          const isInc = f.type === "income" || f.type === "in";
          const isExp = f.type === "expense" || f.type === "out";
          if (f.isActual) {
            if (isInc) pt.actualIncome += f.amount;
            if (isExp) pt.actualExpense += f.amount;
          } else {
            if (isInc) pt.plannedIncome += f.amount;
            if (isExp) pt.plannedExpense += f.amount;
          }
        }
      });

      return points;
    }
  }, [flows, loans, vaults, timeframe, currentTotalDebt]);

  // ========================================================
  // TỔNG KẾT NHANH SỐ LIỆU CHO 5 THẺ SUMMARY
  // ========================================================
  const summaryTotals = useMemo(() => {
    return chartData.reduce(
      (acc, p) => ({
        actualIncome: acc.actualIncome + p.actualIncome,
        actualExpense: acc.actualExpense + p.actualExpense,
        plannedIncome: acc.plannedIncome + p.plannedIncome,
        plannedExpense: acc.plannedExpense + p.plannedExpense,
      }),
      { actualIncome: 0, actualExpense: 0, plannedIncome: 0, plannedExpense: 0 }
    );
  }, [chartData]);

  // ========================================================
  // TÍNH TOÁN TỌA ĐỘ VẼ ĐƯỜNG SVG (Coordinate calculations)
  // ========================================================
  const svgWidth = 880;
  const svgHeight = 310;
  const padLeft = 75;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Tính toán giá trị dòng tiền thu/chi tối đa (loại trừ nợ)
  const maxFlowVal = useMemo(() => {
    let max = 0;
    chartData.forEach((d) => {
      if (visibleSeries.actualIncome && d.actualIncome > max) max = d.actualIncome;
      if (visibleSeries.actualExpense && d.actualExpense > max) max = d.actualExpense;
      if (visibleSeries.plannedIncome && d.plannedIncome > max) max = d.plannedIncome;
      if (visibleSeries.plannedExpense && d.plannedExpense > max) max = d.plannedExpense;
    });
    if (max === 0) return 500000;
    const factor = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.max(100000, Math.ceil((max * 1.25) / factor) * factor);
  }, [chartData, visibleSeries]);

  // Tìm giá trị cực đại để chia tỷ lệ trục Y theo chế độ scale
  const maxVal = useMemo(() => {
    if (scaleMode === "custom" && customMaxY > 0) {
      return customMaxY;
    }

    if (scaleMode === "focus_flows") {
      return maxFlowVal;
    }

    // Chế độ "auto": Tự động theo tất cả các đường đang bật (kể cả Nợ)
    let max = 0;
    chartData.forEach((d) => {
      if (visibleSeries.actualIncome && d.actualIncome > max) max = d.actualIncome;
      if (visibleSeries.actualExpense && d.actualExpense > max) max = d.actualExpense;
      if (visibleSeries.plannedIncome && d.plannedIncome > max) max = d.plannedIncome;
      if (visibleSeries.plannedExpense && d.plannedExpense > max) max = d.plannedExpense;
      if (visibleSeries.debt && d.debtAmount > max) max = d.debtAmount;
    });
    if (max === 0) max = 1000000;
    const factor = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil((max * 1.15) / factor) * factor;
  }, [chartData, visibleSeries, scaleMode, customMaxY, maxFlowVal]);

  // Hàm chuyển đổi điểm dữ liệu sang tọa độ pixel (X, Y)
  const getX = (index: number) => {
    if (chartData.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (chartData.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    if (maxVal === 0) return padTop + chartH;
    // Giới hạn trong khoảng trần để không bị vẽ tràn ra ngoài SVG
    const clampedVal = Math.min(val, maxVal);
    return padTop + chartH - (clampedVal / maxVal) * chartH;
  };

  // Helper định dạng tiền chi tiết & chuẩn xác cho trục Y (VNĐ, k, Tr, Tỷ)
  const formatCompactMoney = (val: number): string => {
    if (val === 0) return "0 ₫";
    if (val >= 1000000000) {
      const b = val / 1000000000;
      return `${Number.isInteger(b) ? b : b.toFixed(1)} Tỷ`;
    }
    if (val >= 1000000) {
      const m = val / 1000000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)} Tr`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return `${Number.isInteger(k) ? k : k.toFixed(0)}k`;
    }
    return `${val.toLocaleString("vi-VN")} ₫`;
  };

  // Tạo danh sách 6 mốc chia chi tiết cho trục Y (0%, 20%, 40%, 60%, 80%, 100%)
  const yTicks = useMemo(() => {
    const steps = 5;
    const ticks: { ratio: number; val: number; label: string }[] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const val = Math.round(maxVal * ratio);
      ticks.push({
        ratio,
        val,
        label: formatCompactMoney(val),
      });
    }
    return ticks;
  }, [maxVal]);

  // Tạo đường dẫn path d cho SVG polyline
  const generatePath = (getter: (d: DataPoint) => number): string => {
    if (chartData.length === 0) return "";
    return chartData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(getter(d)).toFixed(1)}`).join(" ");
  };

  // Tìm index của ngày "Hôm nay"
  const todayIndex = chartData.findIndex((p) => p.isToday);
  const todayX = todayIndex >= 0 ? getX(todayIndex) : null;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
      {/* HEADER KHỐI BIỂU ĐỒ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                Biểu Đồ Đường Xu Hướng Tài Chính
              </h3>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                5 Dòng Dữ Liệu
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đối chiếu trực quan: Thu thật, Chi thật, Dự thu, Dự chi và Diễn biến Nợ theo thời gian
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Cụm chọn mốc thời gian */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setTimeframe("recent")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                timeframe === "recent" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              Gần Đây & Tới
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("six_months")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                timeframe === "six_months" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              6 Tháng
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("year")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                timeframe === "year" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              Năm Nay
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title={isExpanded ? "Thu gọn biểu đồ" : "Mở rộng biểu đồ"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* CỤM 5 THẺ TỔNG KẾT NHANH (Summary Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* 1. Thu Thật */}
            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                🟢 Thu Thật (+)
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 block">
                {summaryTotals.actualIncome.toLocaleString("vi-VN")} ₫
              </span>
            </div>

            {/* 2. Chi Thật */}
            <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50">
              <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">
                🔴 Chi Thật (−)
              </span>
              <span className="text-sm sm:text-base font-black text-rose-700 mt-0.5 block">
                {summaryTotals.actualExpense.toLocaleString("vi-VN")} ₫
              </span>
            </div>

            {/* 3. Dự Thu */}
            <div className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/40">
              <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider block">
                🌿 Dự Thu (Sắp tới)
              </span>
              <span className="text-sm sm:text-base font-black text-teal-700 mt-0.5 block">
                {summaryTotals.plannedIncome.toLocaleString("vi-VN")} ₫
              </span>
            </div>

            {/* 4. Dự Chi */}
            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                🟠 Dự Chi (Sắp tới)
              </span>
              <span className="text-sm sm:text-base font-black text-amber-700 mt-0.5 block">
                {summaryTotals.plannedExpense.toLocaleString("vi-VN")} ₫
              </span>
            </div>

            {/* 5. Đường Nợ Hiện Tại */}
            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40">
              <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider block">
                🟣 Dư Nợ Hiện Tại
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-700 mt-0.5 block">
                {currentTotalDebt.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>

          {/* THANH BẬT / TẮT ẨN HIỆN TỪNG ĐƯỜNG (Interactive Legend) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Hiển thị đường:</span>
            </span>

            {/* Nút 1: Thu Thật */}
            <button
              type="button"
              onClick={() => toggleSeries("actualIncome")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                visibleSeries.actualIncome
                  ? "bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs"
                  : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
              <span>Thu thật (Nét liền)</span>
            </button>

            {/* Nút 2: Chi Thật */}
            <button
              type="button"
              onClick={() => toggleSeries("actualExpense")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                visibleSeries.actualExpense
                  ? "bg-rose-100 text-rose-900 border-rose-400 shadow-2xs"
                  : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
              <span>Chi thật (Nét liền)</span>
            </button>

            {/* Nút 3: Dự Thu */}
            <button
              type="button"
              onClick={() => toggleSeries("plannedIncome")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                visibleSeries.plannedIncome
                  ? "bg-teal-100 text-teal-900 border-teal-400 shadow-2xs"
                  : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-dashed border-teal-600 shrink-0" />
              <span>Dự thu (Nét đứt)</span>
            </button>

            {/* Nút 4: Dự Chi */}
            <button
              type="button"
              onClick={() => toggleSeries("plannedExpense")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                visibleSeries.plannedExpense
                  ? "bg-amber-100 text-amber-900 border-amber-400 shadow-2xs"
                  : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
              }`}
            >
              <span className="w-2.5 h-1 border-t-2 border-dashed border-amber-600 shrink-0" />
              <span>Dự chi (Nét đứt)</span>
            </button>

            {/* Nút 5: Đường Nợ */}
            <button
              type="button"
              onClick={() => toggleSeries("debt")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                visibleSeries.debt
                  ? "bg-indigo-100 text-indigo-950 border-indigo-400 shadow-2xs"
                  : "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
              <span>Đường nợ (Tím)</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* CÔNG CỤ ĐIỀU CHỈNH CỘT TIỀN (TRỤC Y) CHI TIẾT */}
          {/* ======================================================== */}
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                <span className="font-black text-slate-800 flex items-center space-x-1.5 mr-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Điều chỉnh Cột Tiền (Trục Y):</span>
                </span>

                {/* Chế độ 1: Tự động toàn cảnh */}
                <button
                  type="button"
                  onClick={() => setScaleMode("auto")}
                  className={`px-3 py-1 rounded-xl font-bold border transition cursor-pointer flex items-center space-x-1 ${
                    scaleMode === "auto"
                      ? "bg-[#0C2C47] text-white border-[#0C2C47] shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="Tự động chia tỷ lệ theo toàn bộ dữ liệu (kể cả Nợ)"
                >
                  <span>🎯 Tự Động Toàn Cảnh</span>
                  <span className="text-[10px] opacity-80">({formatCompactMoney(maxVal)})</span>
                </button>

                {/* Chế độ 2: Phóng to Thu & Chi (Loại trừ Nợ) */}
                <button
                  type="button"
                  onClick={() => setScaleMode("focus_flows")}
                  className={`px-3 py-1 rounded-xl font-bold border transition cursor-pointer flex items-center space-x-1.5 ${
                    scaleMode === "focus_flows"
                      ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                      : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                  }`}
                  title="Tách biệt khoản nợ lớn, phóng to chi tiết các dòng tiền thu chi từ vài chục nghìn đến vài triệu để thấy rõ đường lượn sóng"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-amber-200" />
                  <span>🔍 Phóng To Thu & Chi</span>
                  {scaleMode === "focus_flows" && (
                    <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                      Max: {formatCompactMoney(maxVal)}
                    </span>
                  )}
                </button>

                {/* Các nút nấc trần nhanh */}
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold px-1 uppercase">Mức trần:</span>
                  {[
                    { label: "250k", val: 250000 },
                    { label: "500k", val: 500000 },
                    { label: "1Tr", val: 1000000 },
                    { label: "5Tr", val: 5000000 },
                    { label: "10Tr", val: 10000000 },
                    { label: "30Tr", val: 30000000 },
                    { label: "50Tr", val: 50000000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setScaleMode("custom");
                        setCustomMaxY(preset.val);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        scaleMode === "custom" && customMaxY === preset.val
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nút Zoom In / Zoom Out tinh chỉnh mượt mà */}
              <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setScaleMode("custom");
                    setCustomMaxY((prev) => Math.max(50000, Math.round((prev || maxVal) * 0.7)));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer shadow-2xs flex items-center space-x-1"
                  title="Phóng to chi tiết (Hạ thấp mức trần trục Y)"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>Phóng to</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScaleMode("custom");
                    setCustomMaxY((prev) => Math.round((prev || maxVal) * 1.4));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer shadow-2xs flex items-center space-x-1"
                  title="Thu nhỏ toàn cảnh (Nâng cao mức trần trục Y)"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thu nhỏ</span>
                </button>
              </div>
            </div>

            {/* Thông báo ngữ cảnh khi đang phóng to thu chi hoặc vượt trần */}
            {visibleSeries.debt && currentTotalDebt > maxVal && (
              <div className="flex items-center justify-between p-2 bg-indigo-50/80 rounded-xl border border-indigo-200 text-[11px] text-indigo-950 font-medium">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm">💡</span>
                  <span>
                    Đang phóng to trục Y ở mức trần <b>{formatCompactMoney(maxVal)}</b> để soi rõ các đường Thu / Chi. Đường nợ <b>{currentTotalDebt.toLocaleString("vi-VN")} ₫</b> đang ở mức cao hơn trần này.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScaleMode("auto")}
                  className="px-2 py-0.5 rounded-md bg-white border border-indigo-300 text-indigo-700 font-black hover:bg-indigo-100 cursor-pointer transition shrink-0 ml-2"
                >
                  Xem toàn cảnh ➔
                </button>
              </div>
            )}
          </div>

          {/* KHUNG VẼ BIỂU ĐỒ SVG TƯƠNG TÁC (Interactive SVG Line Chart) */}
          <div className="relative bg-slate-50/70 rounded-2xl border border-slate-200/90 p-2 sm:p-4 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full min-w-[650px] h-[260px] sm:h-[280px] overflow-visible select-none"
              >
                {/* Lưới ngang chi tiết (Horizontal Grid Lines & Fine Ticks) */}
                {yTicks.map((tick, idx) => {
                  const y = padTop + chartH - tick.ratio * chartH;
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + chartW}
                        y2={y}
                        stroke={tick.ratio === 0 ? "#cbd5e1" : "#e2e8f0"}
                        strokeDasharray={tick.ratio === 0 ? "" : "3 3"}
                        strokeWidth={tick.ratio === 0 ? "1.5" : "1"}
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        fontSize="10"
                        fontWeight={tick.ratio === 0 || tick.ratio === 1 ? "900" : "700"}
                        fill={tick.ratio === 0 ? "#475569" : "#64748b"}
                        textAnchor="end"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {/* Huy hiệu cảnh báo vượt trần nợ nếu đang phóng to */}
                {visibleSeries.debt && currentTotalDebt > maxVal && (
                  <g>
                    <rect
                      x={padLeft + 10}
                      y={padTop + 4}
                      width={230}
                      height={18}
                      rx={4}
                      fill="#ede9fe"
                      stroke="#c4b5fd"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft + 16}
                      y={padTop + 16}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#5b21b6"
                    >
                      🟣 Dư nợ {currentTotalDebt.toLocaleString("vi-VN")} ₫ (vượt trần {formatCompactMoney(maxVal)})
                    </text>
                  </g>
                )}

                {/* Vạch mốc Hôm Nay (Today Reference Line) */}
                {todayX !== null && (
                  <g>
                    <line
                      x1={todayX}
                      y1={padTop}
                      x2={todayX}
                      y2={padTop + chartH}
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.7"
                    />
                    {/* Badge Hôm nay trên đỉnh vạch */}
                    <rect
                      x={todayX - 25}
                      y={padTop - 18}
                      width="50"
                      height="16"
                      rx="4"
                      fill="#6366f1"
                    />
                    <text
                      x={todayX}
                      y={padTop - 6}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#ffffff"
                      textAnchor="middle"
                    >
                      Hôm nay
                    </text>
                  </g>
                )}

                {/* 1. ĐƯỜNG NỢ (Tím Indigo) */}
                {visibleSeries.debt && (
                  <path
                    d={generatePath((d) => d.debtAmount)}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                )}

                {/* 2. ĐƯỜNG DỰ THU (Nét đứt Xanh Ngọc) */}
                {visibleSeries.plannedIncome && (
                  <path
                    d={generatePath((d) => d.plannedIncome)}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                )}

                {/* 3. ĐƯỜNG DỰ CHI (Nét đứt Cam Hổ Phách) */}
                {visibleSeries.plannedExpense && (
                  <path
                    d={generatePath((d) => d.plannedExpense)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                )}

                {/* 4. ĐƯỜNG CHI THẬT (Nét liền Đỏ Hồng) */}
                {visibleSeries.actualExpense && (
                  <path
                    d={generatePath((d) => d.actualExpense)}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 5. ĐƯỜNG THU THẬT (Nét liền Xanh Lá) */}
                {visibleSeries.actualIncome && (
                  <path
                    d={generatePath((d) => d.actualIncome)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* CÁC ĐIỂM DỮ LIỆU & VÙNG TƯƠNG TÁC HOVER */}
                {chartData.map((d, i) => {
                  const x = getX(i);
                  // Chỉ hiển thị nhãn trục X cách quãng nếu quá nhiều ngày
                  const shouldShowLabel =
                    timeframe !== "recent" ||
                    i === 0 ||
                    i === chartData.length - 1 ||
                    i % 4 === 0 ||
                    d.isToday;

                  return (
                    <g key={i}>
                      {/* Nhãn trục X */}
                      {shouldShowLabel && (
                        <text
                          x={x}
                          y={padTop + chartH + 18}
                          fontSize={d.isToday ? "10" : "9"}
                          fontWeight={d.isToday ? "900" : "600"}
                          fill={d.isToday ? "#4338ca" : "#64748b"}
                          textAnchor="middle"
                        >
                          {d.label}
                        </text>
                      )}

                      {/* Điểm nút trên đường Thu thật */}
                      {visibleSeries.actualIncome && d.actualIncome > 0 && (
                        <circle
                          cx={x}
                          cy={getY(d.actualIncome)}
                          r="4"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Điểm nút trên đường Chi thật */}
                      {visibleSeries.actualExpense && d.actualExpense > 0 && (
                        <circle
                          cx={x}
                          cy={getY(d.actualExpense)}
                          r="4"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Điểm nút trên đường Dự thu */}
                      {visibleSeries.plannedIncome && d.plannedIncome > 0 && (
                        <circle
                          cx={x}
                          cy={getY(d.plannedIncome)}
                          r="3.5"
                          fill="#0d9488"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Điểm nút trên đường Dự chi */}
                      {visibleSeries.plannedExpense && d.plannedExpense > 0 && (
                        <circle
                          cx={x}
                          cy={getY(d.plannedExpense)}
                          r="3.5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Cột bắt sự kiện chuột (Invisible hover hitbox) */}
                      <rect
                        x={x - chartW / (chartData.length * 2)}
                        y={padTop}
                        width={chartW / chartData.length}
                        height={chartH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          setHoveredPoint(d);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredPos({ x: rect.left, y: rect.top });
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* TOOLTIP HIỂN THỊ CHI TIẾT TẠI MỐC ĐANG RÊ CHUỘT */}
            {hoveredPoint && (
              <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-lg text-xs space-y-2 transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-black text-slate-800 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mốc thời gian: {hoveredPoint.label} ({hoveredPoint.fullDate})</span>
                  </span>
                  {hoveredPoint.isToday && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Hôm nay
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setHoveredPoint(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Đóng ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                  <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 block">🟢 Thu thật:</span>
                    <span className="font-black text-emerald-700 text-xs">
                      {hoveredPoint.actualIncome.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-800 block">🔴 Chi thật:</span>
                    <span className="font-black text-rose-700 text-xs">
                      {hoveredPoint.actualExpense.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <div className="bg-teal-50/70 p-2 rounded-xl border border-teal-100">
                    <span className="text-[10px] font-bold text-teal-800 block">🌿 Dự thu:</span>
                    <span className="font-black text-teal-700 text-xs">
                      {hoveredPoint.plannedIncome.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-800 block">🟠 Dự chi:</span>
                    <span className="font-black text-amber-700 text-xs">
                      {hoveredPoint.plannedExpense.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-indigo-900 block">🟣 Đường nợ:</span>
                    <span className="font-black text-indigo-700 text-xs">
                      {hoveredPoint.debtAmount.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
