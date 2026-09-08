import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zmoney - Quản lý tài chính cá nhân / hộ kinh doanh",
  description: "Kho chứa - Dòng chảy - Nghĩa vụ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zmoney",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C2C47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-[#0C2C47] text-white shadow-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-black tracking-tight text-white">Zmoney</span>
              <span className="text-[10px] sm:text-xs bg-[#BF512C] text-white px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                VÒNG 2 · PWA
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-300 flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2E5749]"></span>
              <span>DB Online · Port 8121</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-[#ABCBCA] bg-white py-4 text-center text-xs text-slate-500">
          Zmoney · Hệ sinh thái ZOS · PWA Installable
        </footer>

        {/* Script đăng ký Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Zmoney ServiceWorker registered with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('Zmoney ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
