import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Snowflake,
  ShieldCheck,
  RotateCw,
  Package,
  Layers,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { LoadingStatus } from '@waypoint/shared';
import { fetchLoadingTasks } from '../../services/api';
import type { LoadingTasksResponseData, LoadingTaskItem } from '@waypoint/shared';

type FilterTab = 'ALL' | 'NOT_STARTED' | 'LOADING' | 'READY' | 'ISSUES';

export const LoaderDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<LoadingTasksResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchLoadingTasks();
      setData(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load tasks.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filterTasks = (tasks: LoadingTaskItem[]) => {
    switch (activeTab) {
      case 'NOT_STARTED':
        return tasks.filter((t) => t.status === LoadingStatus.NOT_STARTED);
      case 'LOADING':
        return tasks.filter(
          (t) =>
            t.status === LoadingStatus.IN_PROGRESS ||
            t.status === LoadingStatus.ISSUE_REPORTED
        );
      case 'READY':
        return tasks.filter((t) => t.status === LoadingStatus.READY_FOR_DISPATCH);
      case 'ISSUES':
        return tasks.filter(
          (t) => t.status === LoadingStatus.ISSUE_REPORTED || !!t.issue
        );
      case 'ALL':
      default:
        return tasks;
    }
  };

  const getStatusBadge = (status: LoadingStatus, issue?: LoadingTaskItem['issue']) => {
    switch (status) {
      case LoadingStatus.NOT_STARTED:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            NOT STARTED
          </span>
        );
      case LoadingStatus.IN_PROGRESS:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
            <span>IN PROGRESS</span>
          </span>
        );
      case LoadingStatus.ISSUE_REPORTED:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{issue?.issueType || '1 DAMAGED BOX'}</span>
          </span>
        );
      case LoadingStatus.READY_FOR_DISPATCH:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>READY FOR DISPATCH</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getVehicleDisplayIcon = (task: LoadingTaskItem) => {
    if (task.vehicle.tempType === 'REEFER') {
      return (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
          <Snowflake className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
        <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    );
  };

  const filteredTasks = data ? filterTasks(data.tasks) : [];

  const notStartedCount = data
    ? data.tasks.filter((t) => t.status === LoadingStatus.NOT_STARTED).length
    : 0;
  const loadingCount = data
    ? data.tasks.filter(
        (t) =>
          t.status === LoadingStatus.IN_PROGRESS ||
          t.status === LoadingStatus.ISSUE_REPORTED
      ).length
    : 0;
  const readyCount = data
    ? data.tasks.filter((t) => t.status === LoadingStatus.READY_FOR_DISPATCH).length
    : 0;
  const issueCount = data
    ? data.tasks.filter(
        (t) => t.status === LoadingStatus.ISSUE_REPORTED || !!t.issue
      ).length
    : 0;

  return (
    <div className="w-full flex-1 bg-slate-50 text-slate-900 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col space-y-6 pb-28 md:pb-12">
        {/* Dashboard Operational Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Today's Loading Tasks
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-600 mt-2">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tuesday, 29 Sept 2026 • 04:15 AM</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <span>🏛️ Peliyagoda CDC</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-500 font-medium">
                Select an assigned vehicle to review manifests and begin pallet staging.
              </span>
            </div>
          </div>

          {/* Operational Status Badges */}
          <div className="flex items-center space-x-2.5 self-start md:self-center flex-shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Shift 1 • Active</span>
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs sm:text-sm font-semibold hidden sm:inline-flex items-center space-x-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>CDC Synchronized</span>
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            id="loader-loading-spinner"
            className="py-20 flex flex-col items-center justify-center space-y-3"
          >
            <RotateCw className="w-9 h-9 text-sky-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading tasks...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div
            id="loader-error-state"
            className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3 my-4"
          >
            <AlertTriangle className="w-9 h-9 text-rose-600 mx-auto" />
            <div>
              <p className="font-bold text-base">Unable to load tasks.</p>
              <p className="text-xs sm:text-sm text-rose-600 mt-1">{error}</p>
            </div>
            <button
              id="loader-retry-button"
              onClick={loadTasks}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content when data loaded */}
        {!isLoading && !error && data && (
          <>
            {/* Summary Cards Grid (2x2 / 4x1) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 items-stretch" id="loading-summary-section">
              {/* 1. Vehicles to Load */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700">Vehicles to Load</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900" id="summary-vehicles-to-load">
                    {data.summary.vehiclesToLoad}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    Shift 1
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
                  {data.summary.activeBaysCount} bays currently active
                </p>
              </div>

              {/* 2. In Progress */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700">In Progress</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-sky-700" id="summary-in-progress">
                    {data.summary.inProgress}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                    active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
                  Pallet staging active
                </p>
              </div>

              {/* 3. Ready for Dispatch */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700">Ready for Dispatch</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900" id="summary-ready-dispatch">
                    {data.summary.readyForDispatch}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    sealed
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium">
                  Manifests validated
                </p>
              </div>

              {/* 4. Discrepancy */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-rose-700">Discrepancy</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span
                    className={`text-2xl sm:text-3xl lg:text-4xl font-black ${
                      data.summary.discrepancies > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}
                    id="summary-discrepancies"
                  >
                    {data.summary.discrepancies}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    flagged
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-rose-600 mt-1.5 font-medium truncate">
                  {data.summary.discrepancies > 0
                    ? 'Bay hold: Action required'
                    : 'No issues reported'}
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div
              className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-200/70 p-1.5 rounded-xl overflow-x-auto min-h-[46px] sm:min-h-[48px]"
              id="loading-task-filters"
            >
              <button
                id="filter-all"
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 min-h-[38px] sm:min-h-[40px] py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>All</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-100 font-semibold">
                  {data.tasks.length}
                </span>
              </button>
              <button
                id="filter-not-started"
                onClick={() => setActiveTab('NOT_STARTED')}
                className={`flex-1 min-h-[38px] sm:min-h-[40px] py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'NOT_STARTED'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>Not Started</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-100 font-semibold">
                  {notStartedCount}
                </span>
              </button>
              <button
                id="filter-loading"
                onClick={() => setActiveTab('LOADING')}
                className={`flex-1 min-h-[38px] sm:min-h-[40px] py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'LOADING'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>Loading</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-100 font-semibold">
                  {loadingCount}
                </span>
              </button>
              <button
                id="filter-ready"
                onClick={() => setActiveTab('READY')}
                className={`flex-1 min-h-[38px] sm:min-h-[40px] py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'READY'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>Ready</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-100 font-semibold">
                  {readyCount}
                </span>
              </button>
              <button
                id="filter-issues"
                onClick={() => setActiveTab('ISSUES')}
                className={`flex-1 min-h-[38px] sm:min-h-[40px] py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'ISSUES'
                    ? 'bg-rose-900 text-white shadow-sm'
                    : 'text-rose-700 hover:text-rose-900 hover:bg-rose-200/60'
                }`}
              >
                <span>Issues</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-700/60 text-slate-100 font-semibold">
                  {issueCount}
                </span>
              </button>
            </div>

            {/* Task Cards List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6 items-stretch" id="loading-tasks-list">
              {filteredTasks.length === 0 ? (
                <div
                  id="no-tasks-state"
                  className="bg-white p-10 rounded-xl border border-slate-200 text-center space-y-3 lg:col-span-2"
                >
                  <Package className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-base font-bold text-slate-700">No loading tasks found</p>
                  <p className="text-sm text-slate-500">
                    No vehicles matching the selected filter currently require attention.
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isIssue = task.status === LoadingStatus.ISSUE_REPORTED;
                  const isReady = task.status === LoadingStatus.READY_FOR_DISPATCH;
                  const isNotStarted = task.status === LoadingStatus.NOT_STARTED;

                  return (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col h-full transition hover:border-slate-300 hover:shadow-sm"
                    >
                      {/* 1. Header Region: Vehicle ID • Trip • Bay | Status */}
                      <div className="flex items-center justify-between gap-2 min-h-[36px]">
                        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                          <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                            {task.vehicle.registrationNumber.slice(-6)} • Trip {task.tripSequenceNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-slate-900 text-white tracking-wider flex-shrink-0">
                            {task.bay}
                          </span>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(task.status, task.issue)}</div>
                      </div>

                      {/* 2. Vehicle & Operational Information (flex-1 pushes progress and action down equally) */}
                      <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between mt-3.5">
                        <div className="space-y-3">
                          {/* Vehicle spec row */}
                          <div className="flex items-start space-x-3">
                            {getVehicleDisplayIcon(task)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                                  {task.vehicle.modelName}
                                </h3>
                                {isReady && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 flex-shrink-0">
                                    100% Stowed
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                Reg: {task.vehicle.registrationNumber}
                              </p>
                            </div>
                          </div>

                          {/* Departure info */}
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <span className="font-medium">{task.departureFormatted}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-sky-700">{task.departureCountdown}</span>
                          </div>

                          {/* Orders & Stops */}
                          <div className="text-xs sm:text-sm text-slate-600 font-medium break-words">
                            <span>
                              {task.ordersCount} Orders • {task.stopsCount} Stops
                            </span>
                            {task.stopsSummary && (
                              <span className="text-slate-500"> ({task.stopsSummary})</span>
                            )}
                            <span className="text-slate-400"> • </span>
                            <span className="font-semibold text-slate-700">
                              {task.temperatureRequirement}
                            </span>
                          </div>
                        </div>

                        {/* 3. Status-Specific Region (Consistent min-height on tablet/desktop so progress & CTA align) */}
                        <div className="mt-2 min-h-0 sm:min-h-[52px] lg:min-h-[56px] flex items-center">
                          {isIssue ? (
                            <div className="w-full p-2.5 sm:p-3 rounded-lg bg-rose-100/80 border border-rose-300 text-xs sm:text-sm text-rose-900 flex items-start space-x-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                              <span className="font-bold text-rose-950 line-clamp-2">
                                {task.issue?.description || 'Carton damage: Waiting for authorization'}
                              </span>
                            </div>
                          ) : isReady ? (
                            <div className="w-full p-2.5 sm:p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-xs sm:text-sm text-slate-700 space-y-1">
                              <p className="font-medium truncate">
                                Seal: #{task.sealNumber || 'SL-9942'} • Driver: {task.driver?.name || 'N. Perera'}
                              </p>
                              <div className="flex items-center space-x-1.5 text-blue-700 font-semibold text-xs sm:text-sm">
                                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Digital dispatch clearance issued</span>
                              </div>
                            </div>
                          ) : task.vehicle.tempType === 'REEFER' ? (
                            <div className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-white border border-sky-200 text-xs sm:text-sm font-semibold text-sky-900">
                              <Snowflake className="w-4 h-4 text-sky-600 flex-shrink-0" />
                              <span className="truncate">Set Target: Chilled +4°C / Frozen -18°C Verified</span>
                            </div>
                          ) : (
                            <div className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/80 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600">
                              <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="truncate">Ambient cargo hold: Dry freight staging</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Progress Bar Section */}
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                          <span className="text-slate-600">{task.progress.label}</span>
                          <span
                            className={
                              isIssue
                                ? 'text-rose-700 font-bold'
                                : isReady
                                  ? 'text-slate-900 font-bold'
                                  : 'text-sky-700 font-bold'
                            }
                          >
                            {task.progress.loadedItems} / {task.progress.totalItems} items ({task.progress.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isIssue
                                ? 'bg-rose-500'
                                : isReady
                                  ? 'bg-slate-900'
                                  : 'bg-sky-600'
                            }`}
                            style={{ width: `${task.progress.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* 5. Action Button Section (mt-auto ensures aligned bottom baseline across row) */}
                      <div className="mt-auto pt-4">
                        {isNotStarted && (
                          <button
                            id={`start-loading-btn-${task.id}`}
                            onClick={() => navigate(`/loader/tasks/${task.id}`)}
                            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm md:text-base flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition cursor-pointer"
                          >
                            <span>▶ Start Loading</span>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}

                        {task.status === LoadingStatus.IN_PROGRESS && (
                          <button
                            id={`continue-loading-btn-${task.id}`}
                            onClick={() => navigate(`/loader/tasks/${task.id}`)}
                            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm md:text-base flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition cursor-pointer"
                          >
                            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Continue Loading →</span>
                          </button>
                        )}

                        {isIssue && (
                          <button
                            id={`review-issue-btn-${task.id}`}
                            onClick={() => navigate(`/loader/tasks/${task.id}`)}
                            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs sm:text-sm md:text-base flex items-center justify-center space-x-2 transition cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                            <span>Review Issue & Re-scan</span>
                          </button>
                        )}

                        {isReady && (
                          <button
                            id={`view-manifest-btn-${task.id}`}
                            onClick={() => navigate(`/loader/tasks/${task.id}`)}
                            className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm md:text-base flex items-center justify-center space-x-2 transition cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                            <span>View Locked Manifest</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop/tablet md+ since top header provides global navigation) */}
      <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur px-6 py-2.5 flex items-center justify-around text-xs font-semibold text-slate-500 z-30 fixed bottom-0 left-0 right-0 shadow-lg">
        <button
          id="mobile-nav-tasks"
          onClick={() => setActiveTab('ALL')}
          className={`flex flex-col items-center space-y-0.5 transition ${
            activeTab === 'ALL' ? 'text-sky-700 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListTodo className="w-5 h-5" />
          <span className="text-[11px]">Tasks</span>
        </button>
        <button
          id="mobile-nav-current-load"
          onClick={() => {
            if (data && data.tasks.length > 0) {
              navigate(`/loader/tasks/${data.tasks[0].id}`);
            }
          }}
          className="flex flex-col items-center space-y-0.5 transition text-slate-600 hover:text-slate-900"
        >
          <Truck className="w-5 h-5" />
          <span className="text-[11px]">Current Load</span>
        </button>
        <button
          id="mobile-nav-issues"
          onClick={() => setActiveTab('ISSUES')}
          className={`flex flex-col items-center space-y-0.5 transition relative ${
            activeTab === 'ISSUES' ? 'text-rose-700 font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <AlertTriangle className={`w-5 h-5 ${activeTab === 'ISSUES' ? 'text-rose-700' : 'text-rose-600'}`} />
            {issueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </div>
          <span className="text-[11px]">Issues</span>
        </button>
      </div>
    </div>
  );
};
