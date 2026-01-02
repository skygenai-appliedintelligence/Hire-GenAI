"use client"

import CustomerInteractionsTab from "@/app/admin-hiregenai/_components/CustomerInteractionsTab"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CustomerInteractionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-hiregenai/settings">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customer Interactions</h1>
        <p className="text-slate-400">Manage contact submissions and meeting requests</p>
      </div>
      
      <CustomerInteractionsTab />
    </div>
  )
}
