"use client";

import React, { useState } from "react";
import {
  Activity,
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Scale,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Info,
  Lightbulb,
  Droplets,
  Target
} from "lucide-react";

export interface FinancialHealthProps {
  positiveBalance: number; // Tổng MoBo khả dụng (+)
  negativeDebt: number;    // Dư nợ ngân hàng (−)
  netWorth: number;        // Tài sản ròng
  vaults: Array<{ id: string; name: string; balance: number; type: string }>;
  loans: Array<{ id: string; role: string; amount: number; remainingAmount?: number; status: string; partnerName: string }>;
  flows: Array<{ id: string; amount: number; type: "income" | "expense" | "transfer" | string; isActual: boolean; date?: string; rawDate?: string }>;
  systemSettings: {
    maxNegativeDebtAllowed: number;
    minVaultBalanceAllowed: number;
    plannedAdvanceNoticeDays: number;
  };
}

export default function FinancialHealthChart({
  positiveBalance,
  negativeDebt,
  netWorth,
  vaults,
  loans,
  flows,
  systemSettings,
}: FinancialHealthProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState<"all" | "pillars" | "balance">("all");

  // ========================================================
  // 1. TÍNH TOÁN CÁC THÔNG SỐ CƠ BẢN
  // ========================================================
  const activeLoans = loans.filter((l) => l.status === "active");
  const peerDebt = activeLoans
    .filter((l) => l.role === "debtor")
    .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);
  const peerReceivables = activeLoans
    .filter((l) => l.role === "creditor")
    .reduce((sum, l) => sum + (l.remainingAmount ?? l.amount), 0);

  // Tổng nợ thực tế: Nợ ngân hàng thấu chi + Nợ cá nhân đi vay
  const totalDebt = negativeDebt + peerDebt;
  // Tổng tài sản thực tế: Tiền MoBo dương khả dụng + Tiền cho người khác vay chờ thu
  const totalAssets = positiveBalance + peerReceivables;

  // Dòng tiền thực tế phát sinh (hỗ trợ cả 'income'/'in' và 'expense'/'out')
  const actualFlows = flows.filter((f) => f.isActual);
  const totalIncome = actualFlows.filter((f) => f.type === "income" || f.type === "in").reduce((s, f) => s + f.amount, 0);
  const totalExpense = actualFlows.filter((f) => f.type === "expense" || f.type === "out").reduce((s, f) => s + f.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  // Dòng tiền dự kiến tương lai
  const plannedFlows = flows.filter((f) => !f.isActual);
  const upcomingIncome = plannedFlows.filter((f) => f.type === "income" || f.type === "in").reduce((s, f) => s + f.amount, 0);
  const upcomingExpense = plannedFlows.filter((f) => f.type === "expense" || f.type === "out").reduce((s, f) => s + f.amount, 0);

  // ========================================================
  // 2. TÍNH ĐIỂM 4 TRỤ CỘT SỨC KHỎE TÀI CHÍNH (Thang 100 điểm)
  // ========================================================

  // TRỤ CỘT 1: TỶ LỆ AN TOÀN NỢ (Trọng số: 30 điểm)
  let score1 = 30;
  let reason1 = "Không có bất kỳ khoản nợ nào.";
  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) : (totalDebt > 0 ? 1 : 0);

  if (totalDebt === 0) {
    score1 = 30;
    reason1 = "Tuyệt đối an toàn: Không phát sinh nợ ngân hàng hay nợ đối tác.";
  } else if (debtRatio <= 0.2) {
    score1 = 28;
    reason1 = `Nợ thấp (${Math.round(debtRatio * 100)}% tài sản): Đòn bẩy nợ rất an toàn.`;
  } else if (debtRatio <= 0.4) {
    score1 = 24;
    reason1 = `Nợ vừa phải (${Math.round(debtRatio * 100)}% tài sản): Trong mức chấp nhận được.`;
  } else if (debtRatio <= 0.6) {
    score1 = 18;
    reason1 = `Nợ đáng kể (${Math.round(debtRatio * 100)}% tài sản): Cần lên kế hoạch trả dần.`;
  } else if (debtRatio <= 0.8) {
    score1 = 12;
    reason1 = `Nợ cao (${Math.round(debtRatio * 100)}% tài sản): Chiếm phần lớn tài sản.`;
  } else {
    score1 = 5;
    reason1 = `Nợ nguy hiểm (${Math.round(debtRatio * 100)}% tài sản): Nợ áp đảo hoặc tài sản âm.`;
  }

  // Phạt nếu nợ ngân hàng vượt ngưỡng cài đặt
  if (negativeDebt > systemSettings.maxNegativeDebtAllowed) {
    score1 = Math.max(0, score1 - 5);
    reason1 += " (⚠️ Đang vượt ngưỡng nợ tối đa cài đặt!)";
  }

  // TRỤ CỘT 2: KHẢ NĂNG THANH KHOẢN & ĐỆM TIỀN MẶT (Trọng số: 25 điểm)
  let score2 = 25;
  let reason2 = "";
  const nearTermDemand = upcomingExpense + (negativeDebt > 0 ? negativeDebt * 0.3 : 0);

  if (nearTermDemand === 0) {
    if (positiveBalance > 0) {
      score2 = 25;
      reason2 = "Đệm tiền dồi dào, không có áp lực dự chi hay nợ gấp.";
    } else {
      score2 = 15;
      reason2 = "Không có tiền mặt khả dụng dự phòng.";
    }
  } else {
    const coverageRatio = positiveBalance / nearTermDemand;
    if (coverageRatio >= 2.0) {
      score2 = 25;
      reason2 = `Đệm tiền mặt gấp ${coverageRatio.toFixed(1)}x nhu cầu chi trả: Rất an tâm.`;
    } else if (coverageRatio >= 1.2) {
      score2 = 21;
      reason2 = `Đệm tiền mặt gấp ${coverageRatio.toFixed(1)}x nhu cầu chi trả: Đủ trang trải an toàn.`;
    } else if (coverageRatio >= 0.8) {
      score2 = 16;
      reason2 = `Đệm tiền mặt gấp ${coverageRatio.toFixed(1)}x nhu cầu: Vừa đủ trang trải sát nút.`;
    } else if (coverageRatio >= 0.4) {
      score2 = 10;
      reason2 = `Đệm tiền mặt chỉ đạt ${coverageRatio.toFixed(1)}x nhu cầu: Có nguy cơ thiếu hụt.`;
    } else {
      score2 = 4;
      reason2 = `Thiếu hụt thanh khoản nghiêm trọng (< ${Math.round(coverageRatio * 100)}% nhu cầu).`;
    }
  }

  // TRỤ CỘT 3: THẶNG DƯ DÒNG TIỀN & TIẾT KIỆM (Trọng số: 25 điểm)
  let score3 = 20;
  let reason3 = "";

  if (totalIncome === 0 && totalExpense === 0) {
    score3 = 18;
    reason3 = "Chưa phát sinh dòng tiền thực tế trong kỳ.";
  } else if (totalIncome >= totalExpense) {
    const savingsPercent = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    if (savingsPercent >= 35) {
      score3 = 25;
      reason3 = `Dòng tiền thặng dư xuất sắc (+${savingsPercent}% thu nhập).`;
    } else if (savingsPercent >= 20) {
      score3 = 22;
      reason3 = `Tích lũy tốt: Dòng tiền dương (+${savingsPercent}% thu nhập).`;
    } else if (savingsPercent >= 5) {
      score3 = 18;
      reason3 = `Dòng tiền dương nhẹ (+${savingsPercent}% thu nhập).`;
    } else {
      score3 = 14;
      reason3 = "Dòng tiền hòa vốn (Thu xấp xỉ Chi).";
    }
  } else {
    const deficitPercent = totalIncome > 0 ? Math.round(((totalExpense - totalIncome) / totalIncome) * 100) : 100;
    if (deficitPercent <= 15) {
      score3 = 11;
      reason3 = `Chi vượt thu nhẹ (${deficitPercent}%): Cần lưu ý điều chỉnh.`;
    } else if (deficitPercent <= 40) {
      score3 = 7;
      reason3 = `Chi vượt thu đáng kể (${deficitPercent}%): Thâm hụt ngân sách.`;
    } else {
      score3 = 3;
      reason3 = "Chi tiêu vượt xa thu nhập: Thâm hụt dòng tiền nặng nề.";
    }
  }

  // TRỤ CỘT 4: KỶ LUẬT TÀI CHÍNH & NGƯỠNG AN TOÀN (Trọng số: 20 điểm)
  let score4 = 20;
  let reason4 = "Tuân thủ tốt các ngưỡng và kế hoạch kiểm soát.";
  const vaultsBelowMin = vaults.filter((v) => v.balance < systemSettings.minVaultBalanceAllowed && v.balance >= 0);
  const vaultsNegative = vaults.filter((v) => v.balance < 0);

  if (vaultsBelowMin.length > 0) {
    score4 -= Math.min(6, vaultsBelowMin.length * 2);
  }
  if (vaultsNegative.length > 0) {
    score4 -= Math.min(6, vaultsNegative.length * 2);
  }
  if (upcomingExpense > upcomingIncome + positiveBalance) {
    score4 -= 4;
  }
  score4 = Math.max(3, score4);

  if (score4 >= 18) {
    reason4 = "Các MoBo duy trì số dư an toàn, kế hoạch tương lai cân bằng.";
  } else if (score4 >= 13) {
    reason4 = `Có ${vaultsBelowMin.length + vaultsNegative.length} MoBo đang ở mức số dư thấp hoặc âm.`;
  } else {
    reason4 = "Nhiều MoBo bị cạn số dư và kế hoạch tương lai đang bội chi.";
  }

  // ========================================================
  // 3. TỔNG ĐIỂM & ĐÁNH GIÁ SỨC KHỎE
  // ========================================================
  const totalScore = Math.min(100, Math.max(0, Math.round(score1 + score2 + score3 + score4)));

  let healthLevel: {
    label: string;
    subLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    needleColor: string;
    icon: any;
    advice: string;
  };

  if (totalScore >= 80) {
    healthLevel = {
      label: "RẤT TỐT (XUẤT SẮC)",
      subLabel: "Tài chính vững mạnh & An toàn cao",
      color: "#10b981",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-300",
      textColor: "text-emerald-700",
      needleColor: "#059669",
      icon: ShieldCheck,
      advice: "Hệ thống tài chính của bạn đang vận hành rất xuất sắc! Đệm tiền mặt dồi dào, nợ ở mức thấp và dòng tiền thặng dư tốt. Bạn hoàn toàn có thể tiếp tục kế hoạch gia tăng tích lũy hoặc đầu tư mở rộng.",
    };
  } else if (totalScore >= 65) {
    healthLevel = {
      label: "ỔN ĐỊNH (TỐT)",
      subLabel: "Cân đối tốt, kiểm soát nợ ổn định",
      color: "#0d9488",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-300",
      textColor: "text-teal-700",
      needleColor: "#0f766e",
      icon: HeartPulse,
      advice: "Tài chính duy trì ở mức an toàn ổn định. Nợ nằm trong tầm kiểm soát. Để nâng hạng lên Xuất Sắc, hãy tối ưu hóa thêm 10-15% chi tiêu định kỳ và gia tăng thu hồi các khoản cho vay.",
    };
  } else if (totalScore >= 50) {
    healthLevel = {
      label: "CẦN CHÚ Ý (TRUNG BÌNH)",
      subLabel: "Áp lực nợ hoặc dòng tiền sát ngưỡng",
      color: "#f59e0b",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-300",
      textColor: "text-amber-800",
      needleColor: "#d97706",
      icon: AlertTriangle,
      advice: "Sức khỏe tài chính đang có dấu hiệu chịu áp lực. Dòng tiền tích lũy mỏng hoặc nợ đang tiệm cận ngưỡng an toàn. Nên tạm hoãn các khoản chi chưa cấp thiết và tập trung gia cố đệm tiền mặt MoBo.",
    };
  } else {
    healthLevel = {
      label: "BÁO ĐỘNG (NGUY HIỂM)",
      subLabel: "Thâm hụt tiền mặt hoặc đòn bẩy nợ cao",
      color: "#ef4444",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-300",
      textColor: "text-rose-700",
      needleColor: "#e11d48",
      icon: AlertOctagon,
      advice: "Cảnh báo rủi ro tài chính! Áp lực nợ hoặc mức độ chi tiêu đang vượt quá khả năng tạo dòng tiền. Cần ưu tiên cơ cấu lại nợ, giảm ngay các khoản chi không bắt buộc và bổ sung tiền vào các MoBo âm.",
    };
  }

  // ========================================================
  // 4. TÍNH TOÁN HÌNH HỌC CHO BIỂU ĐỒ GAUGE SVG
  // ========================================================
  // Đồng hồ bán nguyệt: R = 82, tâm = (120, 110)
  // Góc từ 180 độ (bên trái = 0 điểm) đến 0 độ (bên phải = 100 điểm)
  const angleRad = (180 - (totalScore / 100) * 180) * (Math.PI / 180);
  const needleLength = 68;
  const needleX = 120 + needleLength * Math.cos(angleRad);
  const needleY = 110 - needleLength * Math.sin(angleRad);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4 transition-all">
      {/* HEADER KHỐI SỨC KHỎE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                Biểu Đồ Sức Khỏe Tài Chính
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${healthLevel.bgColor} ${healthLevel.textColor} ${healthLevel.borderColor} inline-flex items-center space-x-1`}>
                <healthLevel.icon className="w-3 h-3 shrink-0" />
                <span>{healthLevel.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Chỉ số sức khỏe toàn diện đánh giá qua 4 trụ cột: An toàn nợ, Thanh khoản, Dòng tiền & Kỷ luật
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Cụm nút chuyển góc nhìn */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveView("all")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeView === "all" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              Tổng Thể
            </button>
            <button
              type="button"
              onClick={() => setActiveView("pillars")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeView === "pillars" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              4 Trụ Cột
            </button>
            <button
              type="button"
              onClick={() => setActiveView("balance")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activeView === "balance" ? "bg-white text-slate-900 shadow-2xs font-black" : "hover:text-slate-900"
              }`}
            >
              Tài Sản / Nợ
            </button>
          </div>

          {/* Nút thu gọn / mở rộng */}
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

      {/* NỘI DUNG BIỂU ĐỒ KHI MỞ RỘNG */}
      {isExpanded && (
        <div className="space-y-5 pt-1">
          {/* HÀNG 1: ĐỒNG HỒ ĐO GAUGE & PHÂN TÍCH NHANH */}
          {(activeView === "all" || activeView === "pillars") && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Cột Trái (5/12): SVG Đồng hồ đo bán nguyệt (Speedometer) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl relative">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  ĐỒNG HỒ ĐIỂM SỨC KHỎE TÀI CHÍNH
                </span>

                <div className="relative w-[240px] h-[130px] flex items-center justify-center">
                  <svg width="240" height="130" viewBox="0 0 240 130" className="overflow-visible">
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="35%" stopColor="#f59e0b" />
                        <stop offset="70%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    {/* Vòng cung nền xám nhạt */}
                    <path
                      d="M 38 110 A 82 82 0 0 1 202 110"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />

                    {/* Vòng cung dải màu đa phân vùng */}
                    <path
                      d="M 38 110 A 82 82 0 0 1 202 110"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      opacity="0.88"
                    />

                    {/* Các vạch mốc chia tỷ lệ */}
                    <text x="32" y="125" fontSize="10" fontWeight="bold" fill="#94a3b8" textAnchor="middle">0</text>
                    <text x="120" y="24" fontSize="10" fontWeight="bold" fill="#94a3b8" textAnchor="middle">50</text>
                    <text x="208" y="125" fontSize="10" fontWeight="bold" fill="#94a3b8" textAnchor="middle">100</text>

                    {/* Kim chỉ số (Needle) */}
                    <line
                      x1="120"
                      y1="110"
                      x2={needleX}
                      y2={needleY}
                      stroke={healthLevel.needleColor}
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />

                    {/* Trục tâm kim đồng hồ */}
                    <circle cx="120" cy="110" r="9" fill="#0C2C47" />
                    <circle cx="120" cy="110" r="4" fill="#ffffff" />
                  </svg>
                </div>

                {/* Điểm số lớn hiển thị ngay dưới tâm */}
                <div className="text-center mt-1">
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {totalScore}
                    </span>
                    <span className="text-sm font-bold text-slate-400">/100</span>
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wider block mt-0.5 ${healthLevel.textColor}`}>
                    {healthLevel.label}
                  </span>
                </div>
              </div>

              {/* Cột Phải (7/12): 4 Trụ Cột Chi Tiết & Tỷ Lệ Đạt Được */}
              <div className="lg:col-span-7 space-y-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                  <span>CHI TIẾT 4 TRỤ CỘT ĐÁNH GIÁ:</span>
                  <span className="text-[11px] font-bold text-slate-400">Tổng điểm: 100đ</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Trụ 1: An Toàn Nợ */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center space-x-1">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                        <span>1. An Toàn Nợ</span>
                      </span>
                      <span className="font-black text-slate-900">{score1}/30đ</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((score1 / 30) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 line-clamp-1" title={reason1}>
                      {reason1}
                    </span>
                  </div>

                  {/* Trụ 2: Đệm Thanh Khoản */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center space-x-1">
                        <Droplets className="w-3.5 h-3.5 text-teal-600" />
                        <span>2. Thanh Khoản</span>
                      </span>
                      <span className="font-black text-slate-900">{score2}/25đ</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((score2 / 25) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 line-clamp-1" title={reason2}>
                      {reason2}
                    </span>
                  </div>

                  {/* Trụ 3: Thặng Dư Dòng Tiền */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center space-x-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>3. Dòng Tiền</span>
                      </span>
                      <span className="font-black text-slate-900">{score3}/25đ</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((score3 / 25) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 line-clamp-1" title={reason3}>
                      {reason3}
                    </span>
                  </div>

                  {/* Trụ 4: Kỷ Luật & Kế Hoạch */}
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-black text-slate-800 flex items-center space-x-1">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>4. Kỷ Luật MoBo</span>
                      </span>
                      <span className="font-black text-slate-900">{score4}/20đ</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((score4 / 20) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 line-clamp-1" title={reason4}>
                      {reason4}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HÀNG 2: BIỂU ĐỒ CÂN ĐỐI TÀI SẢN VS NỢ (Asset vs Liabilities Bar) */}
          {(activeView === "all" || activeView === "balance") && (
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Scale className="w-4 h-4 text-indigo-700" />
                  <span>CÂN ĐỐI TỔNG THỂ: TÀI SẢN THỰC CÓ VS TỔNG NỢ & NGHĨA VỤ</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Tỷ lệ đòn bẩy nợ:{" "}
                  <b className={debtRatio > 0.5 ? "text-rose-600" : "text-emerald-700"}>
                    {Math.round(debtRatio * 100)}%
                  </b>{" "}
                  {debtRatio <= 0.3 ? "(Rất an toàn)" : debtRatio <= 0.6 ? "(Mức vừa)" : "(Cảnh báo cao)"}
                </span>
              </div>

              {/* Thanh so sánh tương quan */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cột 1: Tài Sản */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800">🟢 Tổng Tài Sản Thực Tế</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {totalAssets.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>• Tiền MoBo dương: +{positiveBalance.toLocaleString("vi-VN")}₫</span>
                      <span>• Cho vay chờ thu: +{peerReceivables.toLocaleString("vi-VN")}₫</span>
                    </div>
                  </div>

                  {/* Cột 2: Nợ */}
                  <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-800">🔴 Tổng Nợ Phải Trả</span>
                      <span className="font-black text-rose-700 text-sm">
                        {totalDebt.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>• Vay ngân hàng: -{negativeDebt.toLocaleString("vi-VN")}₫</span>
                      <span>• Vay đối tác: -{peerDebt.toLocaleString("vi-VN")}₫</span>
                    </div>
                  </div>
                </div>

                {/* Thanh so sánh tỷ trọng dạng Dual Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Tài sản: {totalAssets + totalDebt > 0 ? Math.round((totalAssets / (totalAssets + totalDebt)) * 100) : 0}%</span>
                    <span>Nợ: {totalAssets + totalDebt > 0 ? Math.round((totalDebt / (totalAssets + totalDebt)) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-700"
                      style={{
                        width: `${totalAssets + totalDebt > 0 ? (totalAssets / (totalAssets + totalDebt)) * 100 : 50}%`,
                      }}
                      title={`Tài sản: ${totalAssets.toLocaleString("vi-VN")} ₫`}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-700"
                      style={{
                        width: `${totalAssets + totalDebt > 0 ? (totalDebt / (totalAssets + totalDebt)) * 100 : 50}%`,
                      }}
                      title={`Nợ: ${totalDebt.toLocaleString("vi-VN")} ₫`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HÀNG 3: NHẬN ĐỊNH & LỜI KHUYÊN TÀI CHÍNH THÔNG MINH */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-slate-50 flex items-start space-x-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <span className="font-black text-indigo-950 block text-xs sm:text-sm">
                Nhận Định & Lời Khuyên Tài Chính Cho Bạn:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {healthLevel.advice}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
