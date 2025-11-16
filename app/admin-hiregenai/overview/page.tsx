import OverviewTab from "@/app/admin-hiregenai/_components/OverviewTab"

export const metadata = {
  title: "Overview - Admin Dashboard",
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Overview</h1>
        <p className="text-slate-400">Executive summary of your platform</p>
      </div>
      <OverviewTab />
    </div>
  )
}
