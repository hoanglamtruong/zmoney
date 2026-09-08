import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zmoney - Quản lý tài chính cá nhân / hộ kinh doanh",
  description: "Kho chứa - Dòng chảy - Nghĩa vụ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-[#0C2C47] text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-black tracking-tight text-white">Zmoney</span>
              <span className="text-xs bg-[#BF512C] text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                Staging Tầng 1
              </span>
            </div>
            <div className="text-sm text-slate-300">
              Cổng quản lý tài chính ZOS · Port 8121
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-[#ABCBCA] bg-white py-4 text-center text-xs text-slate-500">
          Zmoney · Hệ sinh thái ZOS · Hoạt động trên hạ tầng Dell/HP
        </footer>
      </body>
    </html>
  );
}
