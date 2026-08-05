import type { ReactNode } from "react";

import Header from "./Header";

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />

      <main className="p-6">{children}</main>
    </div>
  );
}