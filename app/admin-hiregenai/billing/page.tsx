import BillingTab from "@/app/admin-hiregenai/_components/BillingTab"

export const metadata = {
  title: "Billing & Usage - Admin Dashboard",
}

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Usage</h1>
        <p className="text-slate-400">Track all usage and costs in real-time</p>
      </div>
      <BillingTab />
    </div>
  )
}
