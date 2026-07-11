import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { Patient } from '../types';
import { Search, ChevronLeft, ChevronRight, Users, Phone, Mail, Hash } from 'lucide-react';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 15;

  const loadPatients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search) params.search = search;
      const queryParams = new URLSearchParams(params);

      const res = await apiRequest<Patient[]>(`/api/v1/patients?${queryParams.toString()}`);
      if (res.success && res.data) {
        setPatients(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalItems(res.meta.total || 0);
        }
      } else {
        setErrorMsg(res.message || 'Failed to fetch patients.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching patient records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search input so we don't fire a request on every keystroke
    const delay = setTimeout(() => {
      setPage(1);
      loadPatients();
    }, 350);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm" id="patient_directory_section">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Patient Directory
            </h2>
            {/* <p className="text-[11px] text-slate-400 mt-0.5">
              {totalItems} patient record{totalItems === 1 ? '' : 's'} registered in the system.
            </p> */}
          </div>
        </div>

        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="patient_directory_search_input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email, or Patient ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2" id="patients_loading">
          <span className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-blue-600"></span>
          <span className="text-[10px]">Loading patient records...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4">
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] font-semibold rounded" id="patients_error">
            {errorMsg}
          </div>
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          No patient records found{search ? ` matching "${search}"` : ''}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" id="patients_table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="px-4 py-2.5">Patient ID</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Mobile</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/50 transition-all" id={`patient_row_${p._id}`}>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3 w-3 text-slate-300" />
                      {p.publicId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {p.mobile}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {p.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {p.email}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between" id="patients_pagination_controls">
          <span className="text-[10px] text-slate-400 font-semibold">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              id="patients_prev_page_btn"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 border border-slate-200 rounded disabled:opacity-40 enabled:hover:bg-white text-slate-600"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              id="patients_next_page_btn"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 border border-slate-200 rounded disabled:opacity-40 enabled:hover:bg-white text-slate-600"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
