import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetApplicationStats, useListApplications, useGetRunStatus, Application } from "@workspace/api-client-react";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Info, CheckCircle2, Clock, XCircle, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Dashboard() {
  const { data: stats } = useGetApplicationStats({ query: { refetchInterval: 5000 } });
  const { data: runStatus } = useGetRunStatus({ query: { refetchInterval: 3000 } });
  const [activeTab, setActiveTab] = useState("internships");

  // Type assertion for TS to understand the category strings
  const categoryKey = activeTab as "internships" | "accommodation" | "parttime";
  const categoryStats = stats?.byCategory?.[categoryKey];
  
  const isRunning = runStatus?.isRunning && runStatus.activeCategories?.includes(activeTab);

  const { data: applications } = useListApplications({ 
    category: categoryKey as any 
  }, {
    query: { refetchInterval: 5000 }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'duplicate': return <Copy className="w-4 h-4 text-muted-foreground" />;
      case 'manual': return <AlertCircle className="w-4 h-4 text-[#D29922]" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-success bg-success/10 border-success/20';
      case 'pending': return 'text-warning bg-warning/10 border-warning/20';
      case 'failed': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'duplicate': return 'text-muted-foreground bg-secondary border-border';
      case 'manual': return 'text-[#D29922] bg-[#D29922]/10 border-[#D29922]/20';
      default: return 'text-foreground bg-secondary border-border';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-secondary border border-border">
            <TabsTrigger 
              value="internships" 
              className={`data-[state=active]:bg-card data-[state=active]:text-primary ${isRunning && activeTab === 'internships' ? 'animate-pulse' : ''}`}
            >
              Internships
            </TabsTrigger>
            <TabsTrigger 
              value="accommodation"
              className={`data-[state=active]:bg-card data-[state=active]:text-primary ${isRunning && activeTab === 'accommodation' ? 'animate-pulse' : ''}`}
            >
              Accommodation
            </TabsTrigger>
            <TabsTrigger 
              value="parttime"
              className={`data-[state=active]:bg-card data-[state=active]:text-primary ${isRunning && activeTab === 'parttime' ? 'animate-pulse' : ''}`}
            >
              Part-time
            </TabsTrigger>
          </TabsList>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Today's Progress</h3>
              <ProgressRing 
                progress={categoryStats?.today || 0} 
                target={categoryStats?.target || 50} 
              />
            </div>
            
            <div className="md:col-span-3 bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Category Stats</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-mono font-bold text-success">{categoryStats?.sent || 0}</span>
                  <span className="text-sm text-muted-foreground">Auto-Applied</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-mono font-bold text-warning">{categoryStats?.manual || 0}</span>
                  <span className="text-sm text-muted-foreground">Manual Queue</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-mono font-bold text-destructive">{categoryStats?.failed || 0}</span>
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-mono font-bold text-foreground">{categoryStats?.today || 0}</span>
                  <span className="text-sm text-muted-foreground">Total Today</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Tunisia Only</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary">Worldwide</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary">FR</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary">EN</Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 cursor-pointer">Sent</Badge>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 cursor-pointer">Manual Queue</Badge>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Company</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Source</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Lang</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Applied</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No applications found for this category today.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications?.map((app) => (
                    <TableRow key={app.id} className={`hover:bg-secondary/30 transition-colors ${app.isPriority ? 'bg-warning/5 border-l-2 border-l-warning' : ''}`}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {app.company}
                          {app.badge && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">{app.badge}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={app.role}>{app.role}</TableCell>
                      <TableCell className="text-xs">{app.source}</TableCell>
                      <TableCell>
                        <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-secondary">{app.language}</span>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                          {getStatusIcon(app.status)}
                          <span className="capitalize">{app.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(app.appliedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => window.open(app.url, '_blank')}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
