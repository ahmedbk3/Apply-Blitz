import { Layout } from "@/components/layout";
import { useGetManualQueue, useUpdateApplication, useGetApplicationStats, getGetManualQueueQueryKey, getGetApplicationStatsQueryKey, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { ExternalLink, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ManualQueue() {
  const { data: queue, isLoading } = useGetManualQueue();
  const { data: stats } = useGetApplicationStats();
  const updateApplication = useUpdateApplication();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMarkApplied = (id: number, url: string, company: string) => {
    window.open(url, '_blank');
    
    updateApplication.mutate({
      id,
      data: { status: 'sent' }
    }, {
      onSuccess: () => {
        toast({ title: `Marked ${company} as applied` });
        queryClient.invalidateQueries({ queryKey: getGetManualQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Manual Action Queue</h1>
            <p className="text-muted-foreground text-sm">Jobs that require captcha solving, complex forms, or non-standard application processes.</p>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 flex items-center gap-4">
          <div className="bg-warning/20 p-2 rounded-full text-warning">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-warning font-semibold text-sm">Daily Digest</h3>
            <p className="text-warning/80 text-sm">
              Today: {stats?.todayAutoApplied || 0} auto-applied successfully. {stats?.todayManualQueue || 0} jobs need your attention.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-12">Pri</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Source</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Detected</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Clock className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading queue...
                  </TableCell>
                </TableRow>
              ) : queue?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-success/50 mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">Queue is empty</p>
                    <p>All clear! No manual applications needed.</p>
                  </TableCell>
                </TableRow>
              ) : (
                queue?.map((app) => (
                  <TableRow key={app.id} className={`hover:bg-secondary/30 transition-colors ${app.isPriority ? 'bg-[#D29922]/5 border-l-2 border-l-[#D29922]' : ''}`}>
                    <TableCell>
                      {app.isPriority ? <span className="text-[#D29922]">★</span> : null}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{app.company}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={app.role}>{app.role}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary">{app.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{app.source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        onClick={() => handleMarkApplied(app.id, app.url, app.company)}
                        disabled={updateApplication.isPending && updateApplication.variables?.id === app.id}
                      >
                        {updateApplication.isPending && updateApplication.variables?.id === app.id ? (
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Open & Mark Applied
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
