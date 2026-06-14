import { useGetApplicationStats, useGetRunStatus } from "@workspace/api-client-react";

export function StatsBar() {
  const { data: stats } = useGetApplicationStats({ query: { refetchInterval: 5000 } });
  const { data: runStatus } = useGetRunStatus({ query: { refetchInterval: 3000 } });

  const isRunning = runStatus?.isRunning;

  return (
    <div className={`h-12 border-b border-border bg-card flex items-center px-6 justify-between shrink-0 transition-colors ${isRunning ? 'border-b-success/30' : ''}`}>
      <div className="flex items-center gap-6 font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total today:</span>
          <span className="text-foreground font-semibold">
            <span className="text-primary">{stats?.todayTotal || 0}</span> / {stats?.todayTarget || 150}
          </span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Auto-applied:</span>
          <span className="text-success font-semibold">{stats?.todayAutoApplied || 0}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Manual queue:</span>
          <span className="text-warning font-semibold">{stats?.todayManualQueue || 0}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Failed:</span>
          <span className="text-destructive font-semibold">{stats?.todayFailed || 0}</span>
        </div>
        <div className="w-px h-4 bg-border"></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">All-time:</span>
          <span className="text-primary font-semibold">{stats?.allTimeTotal || 0}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-mono text-sm bg-secondary px-3 py-1 rounded-full">
          <span className="text-muted-foreground">Success Rate</span>
          <span className="text-success font-semibold">{(stats?.successRate || 0).toFixed(1)}%</span>
        </div>
        
        {isRunning && (
          <div className="flex items-center gap-2 text-success text-xs font-mono uppercase tracking-wider animate-pulse">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            System Active
          </div>
        )}
      </div>
    </div>
  );
}
