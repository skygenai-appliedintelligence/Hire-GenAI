import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricsCardProps {
  title: string
  value: string | number
  subtext?: string
  trend?: {
    value: number
    label: string
  }
  icon: LucideIcon
  iconColor?: string
  onClick?: () => void
  className?: string
}

export function MetricsCard({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  iconColor = "text-blue-600",
  onClick,
  className = ""
}: MetricsCardProps) {
  const getTrendColor = (trendValue: number) => {
    return trendValue >= 0 ? "text-green-600" : "text-red-600"
  }

  const getTrendIcon = (trendValue: number) => {
    return trendValue >= 0 ? "↗" : "↘"
  }

  return (
    <Card
      className={`
        border border-gray-200 bg-white rounded-2xl shadow-lg hover:shadow-2xl 
        ring-1 ring-transparent hover:ring-emerald-300 ring-offset-1 ring-offset-white 
        motion-safe:transition-shadow emerald-glow
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick()
        }
      } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        {(subtext || trend) && (
          <div className="flex items-center justify-between">
            {subtext && (
              <div className="text-xs text-gray-500">{subtext}</div>
            )}
            {trend && (
              <div className="flex items-center space-x-1 text-xs">
                <span className={getTrendColor(trend.value)}>
                  {getTrendIcon(trend.value)} {Math.abs(trend.value)}%
                </span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MetricsDashboardProps {
  metrics: Array<{
    title: string
    value: string | number
    subtext?: string
    trend?: {
      value: number
      label: string
    }
    icon: LucideIcon
    iconColor?: string
    onClick?: () => void
  }>
  className?: string
}

export function MetricsDashboard({ metrics, className = "" }: MetricsDashboardProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {metrics.map((metric, index) => (
        <MetricsCard
          key={index}
          title={metric.title}
          value={metric.value}
          subtext={metric.subtext}
          trend={metric.trend}
          icon={metric.icon}
          iconColor={metric.iconColor}
          onClick={metric.onClick}
        />
      ))}
    </div>
  )
}
