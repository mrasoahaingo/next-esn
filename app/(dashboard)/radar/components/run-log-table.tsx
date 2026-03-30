'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ApiCall } from '@/lib/radar/schemas';

type RunLog = {
  id: string;
  source: string;
  result: Record<string, unknown>;
  logged_at: string;
};

export function RunLogTable({ logs }: { logs: RunLog[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (logs.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Aucun run enregistré.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Source</TableHead>
          <TableHead>Résultats</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const calls = Array.isArray(log.result.calls) ? (log.result.calls as ApiCall[]) : [];
          const summaryFields = Object.entries(log.result)
            .filter(([k]) => k !== 'calls')
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · ');
          const isOpen = expanded.has(log.id);

          return (
            <>
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => calls.length > 0 && toggle(log.id)}
              >
                <TableCell className="text-muted-foreground">
                  {calls.length > 0 ? (
                    isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{log.source}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{summaryFields}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(log.logged_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              </TableRow>
              {isOpen && (
                <TableRow key={`${log.id}-detail`}>
                  <TableCell colSpan={4} className="bg-muted/30 px-4 py-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{calls.length} appels API</p>
                      <div className="space-y-1.5">
                        {calls.map((call, i) => (
                          <div key={i} className="rounded border border-border/60 bg-background p-2 text-xs font-mono">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={call.ok ? 'default' : 'destructive'} className="text-[10px] h-4 px-1">
                                {call.status}
                              </Badge>
                              <span className="truncate text-muted-foreground">{call.endpoint}</span>
                            </div>
                            <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(call.responseData, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
