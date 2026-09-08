"use client";

import { useState } from "react";
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
  Calendar
} from "lucide-react";

export default function Home() {
  // Khối 1: Kho chứa (Điểm chứa tiền)
  const [vaults, setVaults] = useState([
    { id: "1", name: "Ví Tiền Mặt", type: "cash", balance: 15400000, desc: "Tiền mặt két sắt" },
    { id: "2", name: "Tài Khoản MB Bank", type: "bank", balance: 142850000, desc: "TK kinh doanh chính" },
    { id: "3", name: "Quỹ Dự Phòng Khẩn Cấp", type: "reserve", balance: 50000000, desc: "Gửi tiết kiệm linh hoạt" },
    { id: "4", name: "Ví MoMo Kinh Doanh", type: "ewallet", balance: 6200000, desc: "Thanh toán đơn lẻ" },
  ]);

  // Khối 2: Dòng chảy (Giao dịch nối 2 Kho chứa hoặc Thu/Chi)
  const [flows, setFlows] = useState([
    { id: "f1", title: "Khách trả tiền hợp đồng quảng cáo", amount: 25000000, type: "income", from: "Khách hàng ZeeBee", to: "Tài Khoản MB Bank", date: "08/09/2026" },
    { id: "f2", title: "Rút tiền mặt bổ sung quỹ két", amount: 10000000, type: "transfer", from: "Tài Khoản MB Bank", to: "Ví Tiền Mặt", date: "07/09/2026" },
    { id: "f3", title: "Chi phí máy chủ & dịch vụ cloud", amount: 3500000, type: "expense", from: "Tài Khoản MB Bank", to: "Cloudflare/AWS", date: "06/09/2026" },
    { id: "f4", title: "Thu hồi nợ đối tác vật tư", amount: 12000000, type: "income", from: "Công ty In Ấn ABC", to: "Tài Khoản MB Bank", date: "05/09/2026" },
  ]);

  // Khối 3: Nghĩa vụ (Nợ phải thu / phải trả + Thuế tính theo kỳ)
  const [obligations, setObligations] = useState([
    { id: "o1", title: "Nợ phải thu: Hợp đồng thiết kế Zlink", type: "receivable", amount: 30000000, partner: "Công ty Cổ Phần X", interest: "0%", dueDate: "15/09/2026", status: "normal" },
    { id: "o2", title: "Nợ phải trả: Nhà cung cấp thiết bị Dell", type: "payable", amount: 18500000, partner: "Đại lý Phân Phối ICT", interest: "1.2%/tháng", dueDate: "10/09/2026", status: "urgent" },
    { id: "o3", title: "Thuế GTGT & TNCN Quý 3/2026", type: "tax", amount: 9600000, partner: "Chi cục Thuế khu vực", formula: "Khoán 1.5% doanh thu dòng chảy", dueDate: "30/09/2026", status: "normal" },
  ]);

  const totalBalance = vaults.reduce((acc, v) => acc + v.balance, 0);
  const totalReceivable = obligations.filter(o => o.type === "receivable").reduce((acc, o) => acc + o.amount, 0);
  const totalPayable = obligations.filter(o => o.type === "payable").reduce((acc, o) => acc + o.amount, 0);
  const totalTax = obligations.filter(o => o.type === "tax").reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="space-y-8">
      {/* Top Banner KPI / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tổng tài sản các Kho</span>
            <Wallet className="w-5 h-5 text-[#2E5749]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0C2C47]">
            {totalBalance.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 flex items-center text-xs text-[#2E5749] font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            4 Kho chứa tiền đang hoạt động
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Nợ Phải Thu (Khoản chờ vào)</span>
            <ArrowDownLeft className="w-5 h-5 text-[#2E5749]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2E5749]">
            +{totalReceivable.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 text-xs text-slate-500">
            Dự kiến thu hồi trong tháng
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Nợ Phải Trả (Nghĩa vụ ra)</span>
            <ArrowUpRight className="w-5 h-5 text-[#BF512C]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#BF512C]">
            -{totalPayable.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 flex items-center text-xs text-[#DA9B2B] font-medium">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            1 khoản nợ sắp đến hạn (10/09)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#ABCBCA] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Ước tính Thuế kỳ này</span>
            <Building2 className="w-5 h-5 text-[#0C2C47]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0C2C47]">
            {totalTax.toLocaleString("vi-VN")} ₫
          </p>
          <div className="mt-1 text-xs text-slate-500">
            Trích từ Dòng chảy doanh thu
          </div>
        </div>
      </div>

      {/* 3 KHỐI DỮ LIỆU NỀN TẢNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KHỐI 1: KHO CHỨA (ĐIỂM CHỨA TIỀN) */}
        <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">1. Kho Chứa (Điểm Chứa Tiền)</h2>
            </div>
            <button className="text-xs bg-[#0C2C47] text-white px-2 py-1 rounded hover:bg-[#0C2C47]/90 font-medium">
              + Thêm Kho
            </button>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {vaults.map((vault) => (
              <div key={vault.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA] transition">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{vault.name}</span>
                  <span className="font-bold text-[#0C2C47] text-sm">
                    {vault.balance.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
                  <span>{vault.desc}</span>
                  <span className="capitalize text-[11px] px-1.5 py-0.5 rounded bg-[#ABCBCA]/30 text-[#0C2C47] font-medium">
                    {vault.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KHỐI 2: DÒNG CHẢY (GIAO DỊCH NỐI 2 KHO CHỨA) */}
        <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">2. Dòng Chảy (Giao Dịch Nối)</h2>
            </div>
            <button className="text-xs bg-[#BF512C] text-white px-2 py-1 rounded hover:bg-[#BF512C]/90 font-medium">
              + Tạo Giao Dịch
            </button>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {flows.map((flow) => (
              <div key={flow.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm line-clamp-1">{flow.title}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {flow.from} ➔ {flow.to}
                    </div>
                  </div>
                  <span className={`font-bold text-sm whitespace-nowrap ${flow.type === 'income' ? 'text-[#2E5749]' : flow.type === 'expense' ? 'text-[#BF512C]' : 'text-[#0C2C47]'}`}>
                    {flow.type === 'income' ? '+' : flow.type === 'expense' ? '-' : ''}
                    {flow.amount.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{flow.date}</span>
                  <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {flow.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KHỐI 3: NGHĨA VỤ (NỢ PHẢI THU/TRẢ & THUẾ) */}
        <div className="bg-white rounded-xl border border-[#ABCBCA] shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#ABCBCA] bg-[#D6C9C5]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-[#0C2C47]" />
              <h2 className="font-bold text-[#0C2C47] text-base">3. Nghĩa Vụ (Nợ & Thuế)</h2>
            </div>
            <button className="text-xs bg-[#0C2C47] text-white px-2 py-1 rounded hover:bg-[#0C2C47]/90 font-medium">
              + Thêm Nghĩa Vụ
            </button>
          </div>
          <div className="p-4 flex-1 space-y-3">
            {obligations.map((ob) => (
              <div key={ob.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-[#ABCBCA] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm line-clamp-1">{ob.title}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Đối tác: {ob.partner}
                    </div>
                  </div>
                  <span className={`font-bold text-sm whitespace-nowrap ${ob.type === 'receivable' ? 'text-[#2E5749]' : 'text-[#BF512C]'}`}>
                    {ob.amount.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {ob.formula ? `CT: ${ob.formula}` : `Lãi: ${ob.interest}`}
                  </span>
                  <span className={`font-medium text-[11px] px-1.5 py-0.5 rounded flex items-center ${ob.status === 'urgent' ? 'bg-[#DA9B2B]/20 text-[#BF512C] font-semibold' : 'bg-slate-200 text-slate-700'}`}>
                    <Calendar className="w-3 h-3 mr-1" />
                    Hạn: {ob.dueDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
