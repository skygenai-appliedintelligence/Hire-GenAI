import JobsTab from "@/app/admin-hiregenai/_components/JobsTab"

export const metadata = {
  title: "Jobs - Admin Dashboard",
}

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Jobs</h1>
        <p className="text-slate-400">Monitor all job postings and their costs</p>
      </div>
      <JobsTab />
    </div>
  )
}
