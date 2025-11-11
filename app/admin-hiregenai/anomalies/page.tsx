import AnomaliesTab from "@/app/admin-hiregenai/_components/AnomaliesTab"

export const metadata = {
  title: "Anomalies - Admin Dashboard",
}

export default function AnomaliesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Anomalies & Alerts</h1>
        <p className="text-slate-400">Real-time alerts and unusual patterns</p>
      </div>
      <AnomaliesTab />
    </div>
  )
}
