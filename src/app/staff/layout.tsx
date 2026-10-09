import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff — Vedette",
  robots: { index: false, follow: false, nocache: true },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div className="staff-root">{children}</div>;
}
