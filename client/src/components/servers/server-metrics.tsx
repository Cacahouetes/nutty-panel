import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { MetricsSnapshot } from '@/lib/types'

function formatMb(bytes: number): string {
  return Math.round(bytes / 1024 / 1024).toString()
}

function MetricBar({ label, percent, value }: { label: string; percent: number; value: string }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span data-testid={`metrics-${label.toLowerCase()}`}>{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

export function ServerMetrics({ serverId, enabled }: { serverId: string; enabled: boolean }) {
  const query = useQuery({
    queryKey: ['server-metrics', serverId],
    queryFn: () => apiFetch<MetricsSnapshot>(`/api/servers/${serverId}/metrics`),
    enabled,
    refetchInterval: enabled ? 5000 : false,
    retry: false,
  })

  if (!enabled || query.isError || query.data === undefined) {
    return <div className="text-sm text-muted-foreground">Métriques : —</div>
  }

  const metrics = query.data
  const cpuPercent = Number.isFinite(metrics.cpuPercent) ? metrics.cpuPercent : 0
  const memoryPercent = Number.isFinite(metrics.memoryPercent) ? metrics.memoryPercent : 0
  const memoryUsageBytes = Number.isFinite(metrics.memoryUsageBytes) ? metrics.memoryUsageBytes : 0
  const memoryLimitBytes = Number.isFinite(metrics.memoryLimitBytes) ? metrics.memoryLimitBytes : 0

  return (
    <div className="space-y-2" data-testid="server-metrics">
      <MetricBar label="CPU" percent={cpuPercent} value={`${Math.round(cpuPercent)} %`} />
      <MetricBar
        label="RAM"
        percent={memoryPercent}
        value={`${formatMb(memoryUsageBytes)} / ${formatMb(memoryLimitBytes)} Mo`}
      />
    </div>
  )
}
