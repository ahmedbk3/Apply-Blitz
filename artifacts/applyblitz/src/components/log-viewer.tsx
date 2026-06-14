import { useState, useRef, useEffect } from "react";
import { Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  level: 'success' | 'warn' | 'error' | 'info' | 'skip';
  message: string;
  timestamp: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/logs/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setLogs(prev => {
            const newLogs = [...prev, data.data];
            if (newLogs.length > 200) return newLogs.slice(newLogs.length - 200);
            return newLogs;
          });
        }
      } catch (err) {
        console.error("Failed to parse log", err);
      }
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const getColor = (level: string) => {
    switch(level) {
      case 'success': return 'text-success';
      case 'warn': return 'text-warning';
      case 'error': return 'text-destructive';
      case 'info': return 'text-primary';
      case 'skip': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <div className={`fixed bottom-0 left-72 right-0 bg-[#0A0D12] border-t border-border transition-all duration-300 z-50 flex flex-col ${isExpanded ? 'h-64' : 'h-10'}`}>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border/50 bg-[#0A0D12]/80 backdrop-blur shrink-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Terminal className="w-4 h-4" />
          <span>ApplyBlitz Terminal</span>
          <span className="px-2 py-0.5 rounded bg-secondary ml-2">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && !isExpanded && (
            <span className={`text-xs font-mono truncate max-w-md ${getColor(logs[logs.length-1].level)}`}>
              &gt; {logs[logs.length-1].message}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setLogs([]); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/50 italic">Waiting for events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 hover:bg-secondary/20 rounded px-1 -mx-1">
                <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString(undefined, { hour12: false })}</span>
                <span className={`shrink-0 w-16 uppercase ${getColor(log.level)}`}>[{log.level}]</span>
                <span className="text-gray-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
