import React from 'react';
import { apiRequest } from '../lib/api';
import { AuditLog } from '../types';
import { Terminal, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function AuditLogs() {
  const { data: logs = [], isLoading, error, refetch, isFetching } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await apiRequest<AuditLog[]>('/api/v1/audit-logs');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to fetch logs.');
      }
      return res.data;
    }
  });

  const loading = isLoading || isFetching;
  const errorMsg = error ? (error as Error).message : null;

  return (
    <div className="bg-white rounded border border-slate-200 p-4 shadow-sm" id="audit_logs_view">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div>
          <h3 className="text-xs font-bold font-display text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <Terminal className="h-4 w-4 text-blue-600" />
            Enterprise Security Audit Trail
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Real-time chronological logging of logins, booking events, status changes, and schedule updates.
          </p>
        </div>
        
        <button
          id="refresh_logs_btn"
          onClick={() => refetch()}
          disabled={loading}
          className="p-1 px-2.5 hover:bg-slate-50 border border-slate-200 rounded text-slate-600 transition-all flex items-center gap-1.5 text-[10px] font-semibold cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Trace
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2" id="logs_loading">
          <span className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600"></span>
          <span className="text-[10px]">Fetching trace trail...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-semibold rounded" id="logs_error">
          {errorMsg}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          No audit entries present.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]" id="audit_logs_table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Operator User</th>
                <th className="px-3 py-2">User Role</th>
                <th className="px-3 py-2">Action Completed</th>
                <th className="px-3 py-2">Impacted Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all" id={`log_row_${log.id}`}>
                  <td className="px-3 py-2 text-slate-400 font-medium">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <span className="font-bold text-slate-700 block">{log.userName}</span>
                      <span className="text-slate-400 text-[9px]">ID: {log.userId}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      log.userRole === 'Super Admin'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : log.userRole === 'Doctor'
                        ? 'bg-violet-50 text-violet-700 border-violet-100'
                        : 'bg-teal-50 text-teal-700 border-teal-100'
                    }`}>
                      {log.userRole}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">
                    {log.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-[9px] text-slate-500 font-medium">
                    {log.entity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
