import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoBo - Money Box | Quản lý tài chính Zmoney",
  description: "Quản lý tài chính cá nhân & hộ kinh doanh - Money Box (MoBo)",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MoBo",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-[#0C2C47] text-white shadow-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="MoBo - Money Box"
                className="w-10 h-10 rounded-xl shadow-md border border-white/20 object-cover"
              />
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5 leading-tight">
                  <span className="text-xl font-black tracking-tight text-white">MoBo</span>
                  <span className="text-xs text-slate-300 font-bold">• Zmoney</span>
                </div>
                <span className="text-[10px] text-emerald-300 font-semibold tracking-wider uppercase">Money Box</span>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-300 flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium text-slate-200">Trực Tuyến</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Zmoney · Quản lý tài chính cá nhân & hộ kinh doanh · Money Box (MoBo)
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
