import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  FileText,
  UploadCloud,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  Calendar,
  User,
  Building,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  FileCode,
  FileSpreadsheet,
  File,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusPill } from '../components/StatusPill';
import {
  DocumentWithDetails,
  DocumentType,
  Employee,
  AppDocument,
} from '../types';

interface DocumentsPageProps {
  onNavigateToEmployee?: (id: string) => void;
  onNavigateToCompliance?: () => void;
  filterEmployeeId?: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  onNavigateToEmployee,
  onNavigateToCompliance,
  filterEmployeeId,
}) => {
  const { token, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>(filterEmployeeId || 'all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentWithDetails | null>(null);

  // Upload Form State
  const [formData, setFormData] = useState({
    employee_id: filterEmployeeId || '',
    type: 'contract' as DocumentType,
    file_name: '',
    file_size: 128000,
    file_ref: '',
    expiry_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const [resDocs, resEmp] = await Promise.all([
        fetch('/api/documents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resDocs.ok) {
        const docsData = await resDocs.json();
        setDocuments(docsData);
      }
      if (resEmp.ok) {
        const empData = await resEmp.json();
        setEmployees(empData);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [token]);

  const handleOpenUploadModal = (preselectedEmpId?: string) => {
    const targetEmpId = preselectedEmpId || filterEmployeeId || (employees[0]?.id ?? '');
    setFormData({
      employee_id: targetEmpId,
      type: 'contract',
      file_name: '',
      file_size: 145000,
      file_ref: '',
      expiry_date: '',
      notes: '',
    });
    setIsUploadModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          file_name: file.name,
          file_size: file.size,
          file_ref: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.file_name) {
      setFeedback({ type: 'error', message: 'Employee and file name are required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Document uploaded and synchronized with Compliance Center!' });
        setIsUploadModalOpen(false);
        fetchDocs();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to upload document.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (doc: DocumentWithDetails) => {
    if (doc.type === 'contract' && role !== 'hr_head') {
      alert('RLS Policy Violation: Only the HR Head role has permission to delete compliance-critical employment contracts.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Document deleted successfully.' });
        fetchDocs();
        if (previewDoc?.id === doc.id) setPreviewDoc(null);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to delete document.' });
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleDownload = (doc: DocumentWithDetails) => {
    const link = document.createElement('a');
    link.href = doc.file_ref || 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCg==';
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDaysDiff = (deadline?: string) => {
    if (!deadline) return null;
    const today = new Date().toISOString().split('T')[0];
    const diff = Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '120 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'contract':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            Employment Contract
          </span>
        );
      case 'id_card':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
            ID & Visa
          </span>
        );
      case 'certification':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            Certification
          </span>
        );
      case 'tax_form':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            Tax Clearance
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            Other Document
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading documents repository...</p>
        </div>
      </div>
    );
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesEmp = selectedEmployeeFilter === 'all' || doc.employee_id === selectedEmployeeFilter;

    let matchesExpiry = true;
    if (expiryFilter !== 'all') {
      const days = getDaysDiff(doc.expiry_date);
      if (expiryFilter === 'expired') matchesExpiry = days != null && days < 0;
      else if (expiryFilter === 'expiring_soon') matchesExpiry = days != null && days >= 0 && days <= 30;
      else if (expiryFilter === 'valid') matchesExpiry = days != null && days > 30;
    }

    return matchesSearch && matchesType && matchesEmp && matchesExpiry;
  });

  return (
    <div id="documents-repository-page" className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Notion-style Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Documents Repository
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Central repository for employee contracts, identity cards, certifications, and tax clearances with expiry tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="upload-document-btn"
            onClick={() => handleOpenUploadModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          id="documents-feedback-banner"
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and View Bar */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              All Workspace Documents
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {filteredDocs.length} Files
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file name, staff..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Document Types</option>
              <option value="contract">Contracts</option>
              <option value="id_card">ID & Visas</option>
              <option value="certification">Certifications</option>
              <option value="tax_form">Tax Forms</option>
              <option value="other">Other</option>
            </select>

            {/* Expiry Filter */}
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Expiry States</option>
              <option value="expiring_soon">Expiring Soon (≤30 Days)</option>
              <option value="expired">Expired / Overdue</option>
              <option value="valid">Valid & Active</option>
            </select>

            {/* Employee Filter */}
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border-subtle)]">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Content: Table or Grid */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="py-3 px-4 font-semibold">Document Name</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Employee & Department</th>
                  <th className="py-3 px-4 font-semibold">File Size</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date & Tracking</th>
                  <th className="py-3 px-4 font-semibold">Uploaded</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                      No documents match your query filter.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const days = getDaysDiff(doc.expiry_date);
                    const isContract = doc.type === 'contract';

                    return (
                      <tr key={doc.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div
                                onClick={() => setPreviewDoc(doc)}
                                className="font-semibold hover:underline cursor-pointer flex items-center gap-1.5"
                              >
                                <span>{doc.file_name}</span>
                                <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--brand-primary)]" />
                              </div>
                              {doc.notes && (
                                <div className="text-[11px] text-[var(--text-muted)] line-clamp-1 max-w-xs">
                                  {doc.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">{getDocTypeBadge(doc.type)}</td>

                        <td className="py-3 px-4">
                          <div
                            onClick={() => onNavigateToEmployee?.(doc.employee_id)}
                            className="font-medium hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>{doc.employee_name}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {doc.department_name} ({doc.country})
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[var(--text-secondary)] font-mono">
                          {formatFileSize(doc.file_size)}
                        </td>

                        <td className="py-3 px-4">
                          {doc.expiry_date ? (
                            <div className="space-y-0.5 whitespace-nowrap">
                              <div className="font-mono text-[11px]">{doc.expiry_date}</div>
                              {days != null && days < 0 && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  Expired {Math.abs(days)}d ago
                                </span>
                              )}
                              {days != null && days >= 0 && days <= 30 && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Expires in {days}d
                                </span>
                              )}
                              {days != null && days > 30 && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                  Valid ({days}d)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">No Expiry</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">
                          {doc.uploaded_at.split('T')[0]}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview Document"
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Download File"
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              title={
                                isContract && role !== 'hr_head'
                                  ? 'Restricted: HR Head required to delete contracts'
                                  : 'Delete Document'
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isContract && role !== 'hr_head'
                                  ? 'opacity-40 hover:bg-transparent text-[var(--text-muted)]'
                                  : 'hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const days = getDaysDiff(doc.expiry_date);
              const isContract = doc.type === 'contract';

              return (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--brand-primary)]">
                        <FileText className="w-6 h-6" />
                      </div>
                      {getDocTypeBadge(doc.type)}
                    </div>

                    <div>
                      <h4
                        onClick={() => setPreviewDoc(doc)}
                        className="font-bold text-sm text-[var(--text-primary)] hover:underline cursor-pointer line-clamp-1"
                      >
                        {doc.file_name}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] pt-0.5">
                        {formatFileSize(doc.file_size)} · Uploaded {doc.uploaded_at.split('T')[0]}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="font-semibold text-[var(--text-primary)]">{doc.employee_name}</span>
                        <span className="text-[var(--text-muted)]">({doc.department_name})</span>
                      </div>

                      {doc.expiry_date && (
                        <div className="flex items-center gap-1.5 text-[11px] pt-1">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>Expires: {doc.expiry_date}</span>
                          {days != null && days < 0 && (
                            <span className="text-rose-600 font-bold ml-auto">Overdue</span>
                          )}
                          {days != null && days >= 0 && days <= 30 && (
                            <span className="text-amber-600 font-bold ml-auto">{days}d left</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Upload Document */}
      {isUploadModalOpen && (
        <div
          id="upload-document-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Upload Employee Document
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Upload contracts, IDs, or certifications with automated compliance tracking.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} className="space-y-4 text-xs">
              {/* Drag and Drop Zone */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--brand-primary)] bg-[var(--bg-subtle)]/50 text-center space-y-2 relative transition-all">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-[var(--bg-surface)] shadow-xs text-[var(--brand-primary)]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--text-primary)]">
                    {formData.file_name ? formData.file_name : 'Click to select or drag & drop file'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    PDF, PNG, JPG, or DOCX (up to 10MB)
                  </p>
                </div>
              </div>

              {/* Employee Selector */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  required
                >
                  <option value="">Select target employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.job_title} ({emp.department_name || emp.country})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Document Classification *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                  required
                >
                  <option value="contract">Employment Contract (Fixed / Permanent)</option>
                  <option value="id_card">National ID Card / Passport / Visa</option>
                  <option value="certification">Professional Certification / License</option>
                  <option value="tax_form">Tax Form / SSNIT Clearance</option>
                  <option value="other">General HR Document / Asset Handover</option>
                </select>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--text-secondary)]">
                    Expiry / Renewal Date (Optional)
                  </label>
                  <span className="text-[10px] text-[var(--brand-primary)] font-medium">
                    Auto-synced to Compliance Center
                  </span>
                </div>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Notes / Audit Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Executed contract signed by HR Head and Employee, valid for 24 months."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.file_name}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Upload & Index</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Document Preview */}
      {previewDoc && (
        <div
          id="preview-document-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--brand-primary)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] line-clamp-1">
                    {previewDoc.file_name}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {previewDoc.employee_name} · {previewDoc.department_name} ({previewDoc.country})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body: Embedded Viewer */}
            <div className="flex-1 bg-[var(--bg-subtle)]/40 p-6 flex items-center justify-center min-h-[350px] overflow-y-auto">
              {previewDoc.file_ref?.startsWith('data:image/') ? (
                <img
                  src={previewDoc.file_ref}
                  alt={previewDoc.file_name}
                  className="max-h-[450px] rounded-lg shadow-sm border border-[var(--border-subtle)]"
                />
              ) : (
                <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[var(--text-primary)]">
                      {previewDoc.file_name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] pt-1">
                      {getDocTypeBadge(previewDoc.type)} · {formatFileSize(previewDoc.file_size)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)] text-left space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Associated Staff:</span>
                      <span className="font-semibold">{previewDoc.employee_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Upload Date:</span>
                      <span>{previewDoc.uploaded_at.split('T')[0]}</span>
                    </div>
                    {previewDoc.expiry_date && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Expiry Date:</span>
                        <span className="font-semibold text-[var(--brand-primary)]">{previewDoc.expiry_date}</span>
                      </div>
                    )}
                    {previewDoc.notes && (
                      <div className="pt-1.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                        {previewDoc.notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="w-full py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File Copy</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
