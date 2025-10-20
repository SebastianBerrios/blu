import type { Metadata } from "next";
import "./globals.css";
import SideBar from "@/components/SideBar";

export const metadata: Metadata = {
  title: "Blu Café",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <main className="h-dvh flex bg-primary-50">
          <SideBar />
          <div className="w-full h-full pt-4 ">{children}</div>
        </main>
      </body>
    </html>
  );
}
