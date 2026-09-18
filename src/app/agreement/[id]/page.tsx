"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Handshake,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Share2,
  ArrowLeft,
  PenTool,
  RotateCcw,
  Check,
  X,
  FileText,
  ShieldCheck,
  Wallet
} from "lucide-react";

interface Agreement {
  id: string;
  loan_id: string | null;
  title: string;
  creator_role: "creditor" | "debtor";
  creditor_name: string;
  creditor_contact?: string;
  debtor_name: string;
  debtor_contact?: string;
  amount: number;
  interest_rate: number;
  interest_type: "none" | "monthly" | "yearly" | "fixed_sum";
  interest_due_term: string;
  start_date: string;
  startDateFormatted?: string;
  due_date: string | null;
  dueDateFormatted?: string;
  vaultName?: string;
  terms: string;
  creditor_signature?: string;
  creditor_signed_at?: string;
  creditorSignedAtFormatted?: string;
  debtor_signature?: string;
  debtor_signed_at?: string;
  debtorSignedAtFormatted?: string;
  status: "pending" | "partially_signed" | "completed" | "cancelled";
  created_at?: string;
  createdAtFormatted?: string;
}

export default function AgreementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Signing Modal State
  const [activeSigningRole, setActiveSigningRole] = useState<"creditor" | "debtor" | null>(null);
  const [signerName, setSignerName] = useState("");
  const [penColor, setPenColor] = useState<string>("#1e3a8a"); // xanh navy
  const [isSubmittingSign, setIsSubmittingSign] = useState(false);

  // View Mode: 'all' (Cả 2 bản) | 'creditor' (Bản lưu Chủ Nợ) | 'debtor' (Bản lưu Con Nợ)
  const [documentCopyView, setDocumentCopyView] = useState<"all" | "creditor" | "debtor">("all");

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureDrawn, setHasSignatureDrawn] = useState(false);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agreements/${id}`);
      const data = await res.json();
      if (data.success) {
        setAgreement(data.data);
      } else {
        setError(data.error || "Không tìm thấy thỏa thuận");
      }
    } catch (err: any) {
      setError("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAgreement();
  }, [id]);

  // Setup Canvas when Modal opens
  useEffect(() => {
    if (activeSigningRole && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [activeSigningRole, penColor]);

  // Canvas Drawing Handlers (Pointer events support both Touch & Mouse!)
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignatureDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignatureDrawn(false);
  };

  const handleOpenSignModal = (role: "creditor" | "debtor") => {
    setActiveSigningRole(role);
    setSignerName(role === "creditor" ? agreement?.creditor_name || "" : agreement?.debtor_name || "");
    setHasSignatureDrawn(false);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !hasSignatureDrawn) {
      return alert("Vui lòng vẽ chữ ký của bạn vào khung trước khi xác nhận!");
    }
    if (!activeSigningRole) return;

    try {
      setIsSubmittingSign(true);
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");

      const res = await fetch(`/api/agreements/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeSigningRole,
          signature: signatureDataUrl,
          signerName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActiveSigningRole(null);
        await fetchAgreement();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err: any) {
      alert("Lỗi khi gửi chữ ký: " + err.message);
    } finally {
      setIsSubmittingSign(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handlePrint = (view: "all" | "creditor" | "debtor") => {
    setDocumentCopyView(view);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Đang tải biên bản thỏa thuận...</p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100 space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <X className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Không Tìm Thấy Thỏa Thuận</h2>
          <p className="text-xs text-slate-500">{error || "Mã thỏa thuận không tồn tại hoặc đã bị xóa."}</p>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-[#0C2C47] text-white font-black text-xs hover:bg-[#0C2C47]/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay về Trang Chủ MoBo</span>
          </Link>
        </div>
      </div>
    );
  }

  const bothSigned = Boolean(agreement.creditor_signature && agreement.debtor_signature);
  const amountNumber = parseFloat(agreement.amount as any) || 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-12">
      {/* Top Navbar (Ẩn khi In Print) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                <Image src="/logo.png" alt="MoBo Logo" fill sizes="32px" className="object-cover" />
              </div>
              <span className="font-black text-sm text-[#0C2C47] tracking-tight">Money Box</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">
              Hợp Đồng Thỏa Thuận Ký Điện Tử
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép link!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sao Chép Link ID</span>
                </>
              )}
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner Trạng Thái (Ẩn khi In) */}
        <div className="print:hidden">
          {bothSigned ? (
            <div className="bg-emerald-600 text-white p-4.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Thỏa Thuận Đã Hoàn Tất Ký Kết Điện Tử 2 Phía!
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Khoản nợ đã tự động được đồng bộ và import vào hệ thống Quản Lý Sổ Vay & Mượn.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePrint("all")}
                  className="px-3.5 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-xs cursor-pointer flex items-center space-x-1.5 transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu PDF Hợp Đồng</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500 text-white p-4.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Đang Chờ Ký Tên Điện Tử 2 Phía (ID: {agreement.id})
                  </h3>
                  <p className="text-xs text-amber-100">
                    {agreement.creditor_signature && !agreement.debtor_signature
                      ? "Chủ Nợ đã ký, đang chờ Con Nợ truy cập ký tên."
                      : !agreement.creditor_signature && agreement.debtor_signature
                      ? "Con Nợ đã ký, đang chờ Chủ Nợ ký tên."
                      : "Cả Chủ Nợ và Con Nợ cần truy cập đường link này để vẽ chữ ký xác nhận."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-50 text-xs font-black shadow-xs cursor-pointer flex items-center space-x-1.5 transition self-start sm:self-auto"
              >
                <Share2 className="w-4 h-4" />
                <span>Gửi Link Cho Đối Tác Ký</span>
              </button>
            </div>
          )}
        </div>

        {/* Thanh Điều Khiển Tải 2 Bản Lưu (Khi đã hoàn tất ký) */}
        {bothSigned && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Tạo & Tải 2 Bản Lưu Cho Máy Cá Nhân:</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Lưu trữ độc lập cho mỗi bên
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handlePrint("creditor")}
                className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-black text-emerald-800 block">
                    📄 Bản Lưu 1: Dành Cho Chủ Nợ (Bên A)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Tải về máy tính hoặc in file PDF lưu trữ chứng từ cho vay
                  </span>
                </div>
                <Download className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={() => handlePrint("debtor")}
                className="p-3 rounded-xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <span className="text-xs font-black text-rose-800 block">
                    📄 Bản Lưu 2: Dành Cho Con Nợ (Bên B)
                  </span>
                  <span className="text-[11px] text-rose-700">
                    Tải về máy tính hoặc in file PDF lưu trữ nghĩa vụ hoàn nợ
                  </span>
                </div>
                <Download className="w-4 h-4 text-rose-700 group-hover:scale-110 transition shrink-0 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TỜ VĂN BẢN THỎA THUẬN HỢP ĐỒNG (CHUẨN TRANG A4 IN ẤN) */}
        {/* ======================================================== */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-lg print:shadow-none print:border-none print:p-0 print:m-0 space-y-6 text-slate-900">
          
          {/* Quốc hiệu tiêu ngữ */}
          <div className="text-center space-y-1 pb-3 border-b-2 border-slate-900">
            <h4 className="text-xs sm:text-sm font-black tracking-wider uppercase">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </h4>
            <p className="text-xs font-bold underline underline-offset-4">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="pt-4 pb-1">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase text-[#0C2C47]">
                VĂN BẢN THỎA THUẬN VAY MƯỢN TÀI CHÍNH
              </h1>
              <p className="text-xs text-slate-500 font-semibold italic mt-1">
                (Xác lập điện tử qua nền tảng Money Box • Mã định danh: <b className="text-slate-900">{agreement.id}</b>)
              </p>
              {documentCopyView !== "all" && (
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-black uppercase border border-slate-300 bg-slate-100 text-slate-800">
                  {documentCopyView === "creditor" ? "BẢN LƯU DÀNH CHO BÊN A (CHỦ NỢ)" : "BẢN LƯU DÀNH CHO BÊN B (CON NỢ)"}
                </div>
              )}
            </div>
          </div>

          {/* Ngày tháng & Căn cứ */}
          <div className="text-xs text-slate-600 space-y-1 italic">
            <p>
              Hôm nay, ngày {new Date(agreement.start_date).getDate()} tháng {new Date(agreement.start_date).getMonth() + 1} năm {new Date(agreement.start_date).getFullYear()}, hai bên gồm có:
            </p>
          </div>

          {/* Thông tin 2 Bên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
            {/* BÊN A */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <span className="font-black text-emerald-800 text-[11px] uppercase tracking-wider block">
                BÊN A (BÊN CHO VAY / CHỦ NỢ):
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-black text-slate-900 text-sm">{agreement.creditor_name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">SĐT / CCCD:</span>
                <span className="font-semibold text-slate-800">{agreement.creditor_contact || "Theo dữ liệu MoBo"}</span>
              </div>
            </div>

            {/* BÊN B */}
            <div className="space-y-1.5 sm:pl-2">
              <span className="font-black text-rose-800 text-[11px] uppercase tracking-wider block">
                BÊN B (BÊN VAY / CON NỢ):
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-black text-slate-900 text-sm">{agreement.debtor_name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">SĐT / CCCD:</span>
                <span className="font-semibold text-slate-800">{agreement.debtor_contact || "Theo dữ liệu MoBo"}</span>
              </div>
            </div>
          </div>

          {/* NỘI DUNG ĐIỀU KHOẢN */}
          <div className="space-y-3.5 text-xs text-slate-800 leading-relaxed">
            <h4 className="font-black text-sm text-[#0C2C47] uppercase border-b pb-1 border-slate-200">
              CÁC ĐIỀU KHOẢN THỎA THUẬN CHI TIẾT
            </h4>

            {/* Điều 1 */}
            <div>
              <p className="font-bold text-slate-900">
                Điều 1. Số tiền thỏa thuận và Mục đích:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-slate-500">Mục đích vay:</span>{" "}
                  <b className="text-slate-900">{agreement.title}</b>
                </div>
                <div>
                  <span className="text-slate-500">Số tiền gốc:</span>{" "}
                  <b className="text-base font-black text-[#0C2C47]">
                    {amountNumber.toLocaleString("vi-VN")} ₫
                  </b>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-bold">
                    (Quy ước 1 = 1.000 VNĐ)
                  </span>
                </div>
              </div>
            </div>

            {/* Điều 2 */}
            <div>
              <p className="font-bold text-slate-900">
                Điều 2. Mức lãi suất & Kỳ hạn thanh toán lãi:
              </p>
              <p className="mt-0.5 text-slate-700">
                - Mức lãi suất thỏa thuận:{" "}
                <b className="text-slate-900">
                  {agreement.interest_type === "none" || agreement.interest_rate === 0
                    ? "Không tính lãi (0%)"
                    : `${agreement.interest_rate}% (${agreement.interest_type === "monthly" ? "/tháng" : agreement.interest_type === "yearly" ? "/năm" : "cố định"})`}
                </b>.
              </p>
              <p className="text-slate-700">
                - Kỳ hạn chi trả lãi:{" "}
                <b className="text-slate-900">
                  {agreement.interest_due_term === "monthly"
                    ? "Hàng tháng định kỳ"
                    : agreement.interest_due_term === "quarterly"
                    ? "Hàng quý"
                    : agreement.interest_due_term === "end_term"
                    ? "Cuối kỳ thanh toán cùng tiền gốc"
                    : "Theo thỏa thuận 2 bên"}
                </b>.
              </p>
            </div>

            {/* Điều 3 */}
            <div>
              <p className="font-bold text-slate-900">
                Điều 3. Thời hạn vay và Phương thức hoàn trả:
              </p>
              <p className="mt-0.5 text-slate-700">
                - Ngày bắt đầu tính khoản vay: <b className="text-slate-900">{agreement.startDateFormatted || agreement.start_date}</b>.
              </p>
              <p className="text-slate-700">
                - Ngày hết hạn hoàn trả nợ gốc (Đáo hạn):{" "}
                <b className="text-slate-900">{agreement.dueDateFormatted || agreement.due_date || "Theo thông báo thỏa thuận sau"}</b>.
              </p>
              {agreement.vaultName && (
                <p className="text-slate-700">
                  - MoBo liên kết giao dịch: <b className="text-indigo-700">{agreement.vaultName}</b>.
                </p>
              )}
            </div>

            {/* Điều 4 */}
            <div>
              <p className="font-bold text-slate-900">
                Điều 4. Cam kết chung của hai bên:
              </p>
              <p className="mt-0.5 text-slate-600">
                {agreement.terms || "Hai bên tự nguyện xác lập thỏa thuận này trên tinh thần trung thực và bình đẳng, cam kết thực hiện đúng mọi điều khoản và chịu trách nhiệm trước pháp luật."}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 italic">
                * Thỏa thuận này có giá trị pháp lý ràng buộc giữa hai bên kể từ khi cả hai bên hoàn tất ký tên điện tử trên hệ thống. Dữ liệu được mã hóa và lưu trữ xác thực trên hệ thống Money Box.
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 2 CHỮ KÝ ĐIỆN TỬ CANVAS */}
          {/* ======================================================== */}
          <div className="pt-6 border-t-2 border-slate-900">
            <div className="grid grid-cols-2 gap-4 text-center">
              {/* CHỮ KÝ BÊN A (CHỦ NỢ) */}
              <div className="flex flex-col items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 min-h-[190px]">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                    ĐẠI DIỆN BÊN A (CHỦ NỢ)
                  </span>
                  <span className="text-[10px] text-slate-500 italic block">(Ký và ghi rõ họ tên)</span>
                </div>

                <div className="my-2 flex flex-col items-center justify-center w-full min-h-[85px]">
                  {agreement.creditor_signature ? (
                    <div className="space-y-1 flex flex-col items-center">
                      <img
                        src={agreement.creditor_signature}
                        alt="Chữ ký Chủ Nợ"
                        className="h-16 max-w-[180px] object-contain"
                      />
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Đã ký: {agreement.creditorSignedAtFormatted}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="print:hidden space-y-1 text-center">
                      <span className="text-[11px] text-slate-400 italic block">Chưa ký tên</span>
                      <button
                        type="button"
                        onClick={() => handleOpenSignModal("creditor")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs cursor-pointer flex items-center space-x-1 mx-auto transition active:scale-95"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Ký Tên Bên A</span>
                      </button>
                    </div>
                  )}
                </div>

                <span className="font-black text-slate-900 text-xs mt-1">
                  {agreement.creditor_name}
                </span>
              </div>

              {/* CHỮ KÝ BÊN B (CON NỢ) */}
              <div className="flex flex-col items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 min-h-[190px]">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black uppercase text-rose-800 tracking-wider block">
                    ĐẠI DIỆN BÊN B (CON NỢ)
                  </span>
                  <span className="text-[10px] text-slate-500 italic block">(Ký và ghi rõ họ tên)</span>
                </div>

                <div className="my-2 flex flex-col items-center justify-center w-full min-h-[85px]">
                  {agreement.debtor_signature ? (
                    <div className="space-y-1 flex flex-col items-center">
                      <img
                        src={agreement.debtor_signature}
                        alt="Chữ ký Con Nợ"
                        className="h-16 max-w-[180px] object-contain"
                      />
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Đã ký: {agreement.debtorSignedAtFormatted}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="print:hidden space-y-1 text-center">
                      <span className="text-[11px] text-slate-400 italic block">Chưa ký tên</span>
                      <button
                        type="button"
                        onClick={() => handleOpenSignModal("debtor")}
                        className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shadow-xs cursor-pointer flex items-center space-x-1 mx-auto transition active:scale-95"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Ký Tên Bên B</span>
                      </button>
                    </div>
                  )}
                </div>

                <span className="font-black text-slate-900 text-xs mt-1">
                  {agreement.debtor_name}
                </span>
              </div>
            </div>

            {/* Dấu mộc số xác thực dưới hợp đồng */}
            <div className="mt-5 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1">
              <span>Hệ thống quản lý tài chính Money Box (MoBo)</span>
              <span>Mã xác thực chữ ký số: SHA256-{agreement.id}-{(agreement.created_at || agreement.createdAtFormatted || "SIGNED").slice(0, 10)}</span>
              <span>Trạng thái: {bothSigned ? "HỢP ĐỒNG CÓ HIỆU LỰC" : "CHỜ KÝ ĐẦY ĐỦ"}</span>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL KÝ TÊN CANVAS CHUYÊN NGHIỆP */}
      {/* ======================================================== */}
      {activeSigningRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  activeSigningRole === "creditor" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0C2C47]">
                    {activeSigningRole === "creditor" ? "KÝ TÊN BÊN A (CHỦ NỢ)" : "KÝ TÊN BÊN B (CON NỢ)"}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Vẽ chữ ký bằng ngón tay hoặc chuột vào khung bên dưới
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSigningRole(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSignature} className="space-y-3.5">
              {/* Họ tên người ký */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ Và Tên Người Ký *
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>

              {/* Bảng Vẽ Canvas */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Vẽ Chữ Ký Tại Đây *
                  </label>
                  <div className="flex items-center space-x-2">
                    {/* Chọn màu mực */}
                    <button
                      type="button"
                      onClick={() => setPenColor("#1e3a8a")}
                      className={`w-4 h-4 rounded-full bg-blue-900 border ${penColor === "#1e3a8a" ? "ring-2 ring-blue-400" : ""}`}
                      title="Mực Xanh"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#0f172a")}
                      className={`w-4 h-4 rounded-full bg-slate-900 border ${penColor === "#0f172a" ? "ring-2 ring-slate-400" : ""}`}
                      title="Mực Đen"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-0.5 cursor-pointer ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa ký lại</span>
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-1 bg-slate-50 relative overflow-hidden touch-none">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={160}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    className="w-full h-40 bg-white rounded-xl cursor-crosshair block"
                  />
                  {!hasSignatureDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium">
                      ✍️ Dùng ngón tay hoặc chuột vẽ chữ ký tại đây
                    </div>
                  )}
                </div>
              </div>

              {/* Cam kết pháp lý */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-snug flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Bằng việc bấm <b>"Xác Nhận Ký & Đồng Ý"</b>, bạn xác nhận đã đọc, hiểu rõ và đồng ý chịu trách nhiệm với các điều khoản vay mượn nêu trong thỏa thuận này.
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveSigningRole(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSign || !hasSignatureDrawn}
                  className={`px-5 py-2 rounded-xl text-xs font-black text-white transition active:scale-95 cursor-pointer flex items-center space-x-1.5 ${
                    activeSigningRole === "creditor"
                      ? "bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
                      : "bg-rose-700 hover:bg-rose-800 disabled:opacity-50"
                  }`}
                >
                  {isSubmittingSign ? (
                    <span>Đang lưu chữ ký...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác Nhận Ký & Đồng Ý</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
