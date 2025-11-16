import CompaniesTab from "@/app/admin-hiregenai/_components/CompaniesTab"

export const metadata = {
  title: "Companies - Admin Dashboard",
}

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Companies</h1>
        <p className="text-slate-400">Manage all companies and their billing</p>
      </div>
      <CompaniesTab />
    </div>
  )
}
