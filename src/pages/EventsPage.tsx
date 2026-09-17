import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Department, CompanyEventWithDetails, EventType, EventVisibilityScope } from '../types';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  MapPin,
  Video,
  Globe,
  Building2,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  GraduationCap,
  Users,
  PartyPopper,
  Briefcase,
  Layers,
} from 'lucide-react';

interface EventsPageProps {
  departments: Department[];
}

export const EventsPage: React.FC<EventsPageProps> = ({ departments }) => {
  const { authFetch, user, role, subscribeToRealtime } = useAuth();

  const [events, setEvents] = useState<CompanyEventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'upcoming' | 'all' | 'past'>('upcoming');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompanyEventWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyEventWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEventType, setFormEventType] = useState<EventType>('meeting');
  const [formVisibilityScope, setFormVisibilityScope] = useState<EventVisibilityScope>('company');
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');
  const [formStartDatetime, setFormStartDatetime] = useState('');
  const [formEndDatetime, setFormEndDatetime] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Fetch Events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeframe !== 'all') params.set('timeframe', timeframe);
      if (selectedType !== 'all') params.set('event_type', selectedType);
      if (selectedScope !== 'all') params.set('visibility_scope', selectedScope);
      if (selectedDepartmentId !== 'all') params.set('department_id', selectedDepartmentId);

      const res = await authFetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, timeframe, selectedType, selectedScope, selectedDepartmentId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (
        payload.event === 'event_created' ||
        payload.event === 'event_updated' ||
        payload.event === 'event_deleted' ||
        payload.event === 'events_updated'
      ) {
        fetchEvents();
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime, fetchEvents]);

  // Helper to format ISO datetime to local string suitable for <input type="datetime-local" />
  const toInputDatetime = (isoStr: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormError(null);
    setFormTitle('');
    setFormDescription('');
    setFormEventType('meeting');
    setFormVisibilityScope('company');
    setFormDepartmentId(departments[0]?.id || '');

    // Default start time: tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 30, 0, 0);

    setFormStartDatetime(toInputDatetime(tomorrow.toISOString()));
    setFormEndDatetime(toInputDatetime(tomorrowEnd.toISOString()));
    setFormLocation('Accra HQ Conference Room or meet.google.com/kora-event');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (evt: CompanyEventWithDetails) => {
    setEditingEvent(evt);
    setFormError(null);
    setFormTitle(evt.title);
    setFormDescription(evt.description || '');
    setFormEventType(evt.event_type);
    setFormVisibilityScope(evt.visibility_scope);
    setFormDepartmentId(evt.department_id || departments[0]?.id || '');
    setFormStartDatetime(toInputDatetime(evt.start_datetime));
    setFormEndDatetime(toInputDatetime(evt.end_datetime));
    setFormLocation(evt.location);
    setIsModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }

    if (!formStartDatetime || !formEndDatetime) {
      setFormError('Both start and end dates and times are required.');
      return;
    }

    const startDate = new Date(formStartDatetime);
    const endDate = new Date(formEndDatetime);

    if (endDate.getTime() < startDate.getTime()) {
      setFormError('End time cannot be earlier than start time.');
      return;
    }

    if (!formLocation.trim()) {
      setFormError('Location (physical address or virtual meeting link) is required.');
      return;
    }

    if (formVisibilityScope === 'department' && !formDepartmentId) {
      setFormError('Please select a target department for department-scoped events.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        event_type: formEventType,
        visibility_scope: formVisibilityScope,
        department_id: formVisibilityScope === 'department' ? formDepartmentId : null,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        location: formLocation.trim(),
      };

      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save event');
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while saving the event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      const res = await authFetch(`/api/events/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete event');
        return;
      }
      setDeleteTarget(null);
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Error deleting event');
    } finally {
      setActionLoading(false);
    }
  };

  // Search filter
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchesTitle = evt.title.toLowerCase().includes(q);
      const matchesDesc = (evt.description || '').toLowerCase().includes(q);
      const matchesLoc = evt.location.toLowerCase().includes(q);
      const matchesDept = (evt.department_name || '').toLowerCase().includes(q);
      const matchesCreator = (evt.created_by_email || '').toLowerCase().includes(q);
      return matchesTitle || matchesDesc || matchesLoc || matchesDept || matchesCreator;
    });
  }, [events, searchQuery]);

  // Format date helper
  const formatEventDate = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);

      const isSameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

      const monthName = start.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = start.getDate();
      const weekday = start.toLocaleDateString('en-US', { weekday: 'short' });
      const year = start.getFullYear();

      const startTimeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endTimeStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      if (isSameDay) {
        return {
          month: monthName,
          day: dayNum,
          year,
          weekday,
          timeText: `${startTimeStr} – ${endTimeStr}`,
          fullDateText: `${weekday}, ${monthName} ${dayNum}, ${year}`,
        };
      }

      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const endDay = end.getDate();
      return {
        month: monthName,
        day: dayNum,
        year,
        weekday,
        timeText: `${monthName} ${dayNum}, ${startTimeStr} – ${endMonth} ${endDay}, ${endTimeStr}`,
        fullDateText: `${monthName} ${dayNum} – ${endMonth} ${endDay}, ${year}`,
      };
    } catch {
      return { month: '---', day: '--', year: '', weekday: '', timeText: '', fullDateText: '' };
    }
  };

  // Visual type badges
  const renderTypeBadge = (type: EventType) => {
    switch (type) {
      case 'holiday':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
            <PartyPopper className="w-3 h-3" />
            <span>Holiday</span>
          </span>
        );
      case 'meeting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
            <Briefcase className="w-3 h-3" />
            <span>Meeting</span>
          </span>
        );
      case 'social':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
            <Sparkles className="w-3 h-3" />
            <span>Social</span>
          </span>
        );
      case 'training':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
            <GraduationCap className="w-3 h-3" />
            <span>Training</span>
          </span>
        );
    }
  };

  // Location renderer with virtual link detection
  const renderLocation = (loc: string) => {
    const isVirtual =
      loc.includes('http://') ||
      loc.includes('https://') ||
      loc.includes('meet.google') ||
      loc.includes('zoom.us') ||
      loc.includes('teams.microsoft');

    if (isVirtual) {
      let href = loc;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        href = `https://${loc}`;
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-[var(--accent-blue)] hover:underline font-medium"
        >
          <Video className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[260px]">{loc}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
        </a>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
        <span className="truncate max-w-[300px]">{loc}</span>
      </span>
    );
  };

  return (
    <div id="company-events-page" className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Events</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
              Milestone 9
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Schedule, manage, and coordinate organization-wide holidays, team meetings, trainings, and socials.
          </p>
        </div>

        {/* Schedule Event Button (hr_head or hr_analyst) */}
        {(role === 'hr_head' || role === 'hr_analyst') && (
          <button
            id="schedule-event-btn"
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Event</span>
          </button>
        )}
      </div>

      {/* Control Bar & Filters */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs space-y-3">
        {/* Search & Timeframe Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="event-search-input"
              type="text"
              placeholder="Search by title, location, description, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
            />
          </div>

          {/* Timeframe Toggle Pills */}
          <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
            <button
              id="timeframe-upcoming-btn"
              onClick={() => setTimeframe('upcoming')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                timeframe === 'upcoming'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Upcoming
            </button>
            <button
              id="timeframe-all-btn"
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                timeframe === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Events
            </button>
            <button
              id="timeframe-past-btn"
              onClick={() => setTimeframe('past')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                timeframe === 'past'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>

          {/* Event Type Filter */}
          <select
            id="filter-event-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="holiday">Holiday</option>
            <option value="meeting">Meeting</option>
            <option value="social">Social</option>
            <option value="training">Training</option>
          </select>

          {/* Scope Filter */}
          <select
            id="filter-event-scope-select"
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Audiences</option>
            <option value="company">Whole Company Only</option>
            <option value="department">Department-Specific Only</option>
          </select>

          {/* Department Filter (if department scope or any) */}
          <select
            id="filter-event-department-select"
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {(selectedType !== 'all' || selectedScope !== 'all' || selectedDepartmentId !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedType('all');
                setSelectedScope('all');
                setSelectedDepartmentId('all');
                setSearchQuery('');
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline ml-auto cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Events List View */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              {timeframe === 'upcoming' ? 'Upcoming Events' : timeframe === 'past' ? 'Past Events' : 'All Events'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Sorted by upcoming date · Live SSE synchronized
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
            <div className="w-5 h-5 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading company events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">No events found</div>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              {searchQuery || selectedType !== 'all' || selectedScope !== 'all' || selectedDepartmentId !== 'all'
                ? 'No company events match your active filters. Try adjusting your query parameters.'
                : 'There are no events scheduled in this timeframe. Click "Schedule Event" above to create one.'}
            </p>
            {(role === 'hr_head' || role === 'hr_analyst') && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 px-3.5 py-1.5 rounded-md text-xs font-medium bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Event</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredEvents.map((evt) => {
              const dt = formatEventDate(evt.start_datetime, evt.end_datetime);
              const isPast = new Date(evt.end_datetime || evt.start_datetime).getTime() < Date.now();

              return (
                <div
                  key={evt.id}
                  id={`event-item-${evt.id}`}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--bg-subtle)] transition-colors group ${
                    isPast ? 'opacity-75' : ''
                  }`}
                >
                  {/* Left Column: Date Stamp Block */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="shrink-0 w-14 py-2 px-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-center shadow-2xs">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent-blue)]">
                        {dt.month}
                      </div>
                      <div className="text-lg font-extrabold text-[var(--text-primary)] leading-tight">
                        {dt.day}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-medium">{dt.weekday}</div>
                    </div>

                    {/* Middle: Details */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderTypeBadge(evt.event_type)}

                        {/* Visibility Pill */}
                        {evt.visibility_scope === 'company' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Whole Company</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80">
                            <Building2 className="w-3 h-3" />
                            <span>{evt.department_name || 'Department'}</span>
                          </span>
                        )}

                        {isPast && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[var(--text-muted)]">
                            Completed
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                        {evt.title}
                      </h3>

                      {/* Description */}
                      {evt.description && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 max-w-2xl">
                          {evt.description}
                        </p>
                      )}

                      {/* Time & Location Bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>{dt.timeText}</span>
                        </div>
                        {renderLocation(evt.location)}
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Created by {evt.created_by_email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {evt.can_edit ? (
                      <>
                        <button
                          id={`edit-event-btn-${evt.id}`}
                          onClick={() => handleOpenEdit(evt)}
                          className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Edit event"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`delete-event-btn-${evt.id}`}
                          onClick={() => setDeleteTarget(evt)}
                          className="p-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)] italic px-2">
                        View only
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] w-full max-w-lg shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--text-secondary)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {editingEvent ? 'Edit Event' : 'Schedule New Event'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="event-form-title-input"
                  type="text"
                  required
                  placeholder="e.g. Q3 Fintech Executive All-Hands & Product Briefing"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
                />
              </div>

              {/* Event Type & Visibility Scope in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Event Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="event-form-type-select"
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="meeting">Meeting</option>
                    <option value="social">Social</option>
                    <option value="training">Training</option>
                  </select>
                </div>

                {/* Visibility Scope */}
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Visibility Scope <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="event-form-scope-select"
                    value={formVisibilityScope}
                    onChange={(e) => setFormVisibilityScope(e.target.value as EventVisibilityScope)}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="company">Whole Company</option>
                    <option value="department">Specific Department</option>
                  </select>
                </div>
              </div>

              {/* Department Selector (Conditional when department-scoped) */}
              {formVisibilityScope === 'department' && (
                <div className="space-y-1 animate-in fade-in duration-100">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Target Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="event-form-department-select"
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Only members of this department (and HR Head) will see this event on their schedule.
                  </p>
                </div>
              )}

              {/* Start & End Date Time in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-form-start-input"
                    type="datetime-local"
                    required
                    value={formStartDatetime}
                    onChange={(e) => setFormStartDatetime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--text-primary)]">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-form-end-input"
                    type="datetime-local"
                    required
                    value={formEndDatetime}
                    onChange={(e) => setFormEndDatetime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)]">
                  Location (Physical Address or Virtual Link) <span className="text-red-500">*</span>
                </label>
                <input
                  id="event-form-location-input"
                  type="text"
                  required
                  placeholder="e.g. Accra HQ Conference Room B or meet.google.com/xyz-abc"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enter an in-person room/address or paste a Google Meet/Zoom link.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)]">Description / Notes</label>
                <textarea
                  id="event-form-description-input"
                  rows={3}
                  placeholder="Outline the agenda, prerequisites, or preparation requirements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none resize-none"
                />
              </div>

              {/* Training linking note (for Milestone 10 preview) */}
              {formEventType === 'training' && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>
                    Training Event: Direct training session attendance and curriculum linkage will connect automatically in Milestone 10.
                  </span>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="event-form-submit-btn"
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-md bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editingEvent ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{editingEvent ? 'Save Changes' : 'Schedule Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] w-full max-w-sm p-6 shadow-xl space-y-4 text-xs">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Event</h3>
              <p className="text-[var(--text-secondary)]">
                Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{deleteTarget.title}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-event-btn"
                type="button"
                onClick={handleDeleteEvent}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
