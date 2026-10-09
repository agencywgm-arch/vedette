import { redirect } from "next/navigation";
import { staffAuthorized } from "@/lib/staff/guard";
import StaffDashboard from "@/components/staff/StaffDashboard";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  // proxy.ts already turns strangers away; this is the second lock.
  if (!(await staffAuthorized())) redirect("/staff/login");
  return <StaffDashboard />;
}
