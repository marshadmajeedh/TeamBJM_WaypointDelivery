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
  QrCode,
  Package,
  Layers,
  ChevronRight,
  Info,
  X,
  User,
  ListTodo,
} from 'lucide-react';
import { LoadingStatus } from '@waypoint/shared';
import { fetchLoadingTasks } from '../../services/api';
import type { LoadingTasksResponseData, LoadingTaskItem } from '@waypoint/shared';

type FilterTab = 'ALL' | 'NOT_STARTED' | 'LOADING' | 'READY';

export const LoaderDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<LoadingTasksResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [showNotification, setShowNotification] = useState(true);

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
      case 'ALL':
      default:
        return tasks;
    }
  };

  const getStatusBadge = (status: LoadingStatus, issue?: LoadingTaskItem['issue']) => {
    switch (status) {
      case LoadingStatus.NOT_STARTED:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            NOT STARTED
          </span>
        );
      case LoadingStatus.IN_PROGRESS:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
            <span>IN PROGRESS</span>
          </span>
        );
      case LoadingStatus.ISSUE_REPORTED:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{issue?.issueType || '1 DAMAGED BOX'}</span>
          </span>
        );
      case LoadingStatus.READY_FOR_DISPATCH:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center space-x-1">
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
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
          <Snowflake className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
        <Truck className="w-5 h-5" />
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

  return (
    <div className="flex-1 bg-slate-900/40 p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-xl bg-slate-50 text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col min-h-[840px] relative">
        {/* Top Notification Toast / Pill */}
        {showNotification && (
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Notification: Shift active • Central CDC Synchronized</span>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="text-slate-400 hover:text-white transition p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Container */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
          {/* Header Metadata Pill */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 flex items-center space-x-1.5 border border-sky-200">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              <span>Tuesday, 29 Sept 2026 • 04:15 AM</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
              🏛️ Peliyagoda CDC
            </span>
          </div>

          {/* Screen Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Today's Loading Tasks
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Select an assigned vehicle to review manifests and begin pallet staging.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div
              id="loader-loading-spinner"
              className="py-16 flex flex-col items-center justify-center space-y-3"
            >
              <RotateCw className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Loading tasks...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div
              id="loader-error-state"
              className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3 my-4"
            >
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <div>
                <p className="font-semibold text-sm">Unable to load tasks.</p>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
              </div>
              <button
                id="loader-retry-button"
                onClick={loadTasks}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content when data loaded */}
          {!isLoading && !error && data && (
            <>
              {/* Summary Cards Grid (2x2) */}
              <div className="grid grid-cols-2 gap-3" id="loading-summary-section">
                {/* 1. Vehicles to Load */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Vehicles to Load</span>
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-900" id="summary-vehicles-to-load">
                      {data.summary.vehiclesToLoad}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                      Shift 1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    {data.summary.activeBaysCount} bays currently active
                  </p>
                </div>

                {/* 2. In Progress */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">In Progress</span>
                    <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-sky-700" id="summary-in-progress">
                      {data.summary.inProgress}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800">
                      active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Pallet staging active
                  </p>
                </div>

                {/* 3. Ready for Dispatch */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Ready for Dispatch</span>
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-900" id="summary-ready-dispatch">
                      {data.summary.readyForDispatch}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800">
                      sealed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Manifests validated
                  </p>
                </div>

                {/* 4. Discrepancy */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700">Discrepancy</span>
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span
                      className={`text-2xl font-black ${
                        data.summary.discrepancies > 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                      id="summary-discrepancies"
                    >
                      {data.summary.discrepancies}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                      flagged
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-600 mt-1 font-medium truncate">
                    {data.summary.discrepancies > 0
                      ? 'Bay hold: Action required'
                      : 'No issues reported'}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div
                className="flex items-center space-x-1.5 bg-slate-200/70 p-1 rounded-xl overflow-x-auto"
                id="loading-task-filters"
              >
                <button
                  id="filter-all"
                  onClick={() => setActiveTab('ALL')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 whitespace-nowrap ${
                    activeTab === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-100">
                    {data.tasks.length}
                  </span>
                </button>
                <button
                  id="filter-not-started"
                  onClick={() => setActiveTab('NOT_STARTED')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 whitespace-nowrap ${
                    activeTab === 'NOT_STARTED'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Not Started</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-100">
                    {notStartedCount}
                  </span>
                </button>
                <button
                  id="filter-loading"
                  onClick={() => setActiveTab('LOADING')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 whitespace-nowrap ${
                    activeTab === 'LOADING'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Loading</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-100">
                    {loadingCount}
                  </span>
                </button>
                <button
                  id="filter-ready"
                  onClick={() => setActiveTab('READY')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 whitespace-nowrap ${
                    activeTab === 'READY'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Ready</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-100">
                    {readyCount}
                  </span>
                </button>
              </div>

              {/* Task Cards List */}
              <div className="space-y-3.5 pb-16" id="loading-tasks-list">
                {filteredTasks.length === 0 ? (
                  <div
                    id="no-tasks-state"
                    className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2"
                  >
                    <Package className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No loading tasks found</p>
                    <p className="text-xs text-slate-500">
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
                        className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3 transition hover:border-slate-300"
                      >
                        {/* Task Header: Vehicle ID • Trip • Bay | Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                              {task.vehicle.registrationNumber.slice(-6)} • Trip {task.tripSequenceNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white tracking-wider">
                              {task.bay}
                            </span>
                          </div>
                          <div>{getStatusBadge(task.status, task.issue)}</div>
                        </div>

                        {/* Details Box */}
                        <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-start space-x-3">
                            {getVehicleDisplayIcon(task)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm truncate">
                                  {task.vehicle.modelName}
                                </h3>
                                {isReady && (
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                                    100% Stowed
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium">
                                Reg: {task.vehicle.registrationNumber}
                              </p>
                            </div>
                          </div>

                          {/* Departure info */}
                          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium">{task.departureFormatted}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-sky-700">{task.departureCountdown}</span>
                          </div>

                          {/* Orders & Stops */}
                          <div className="text-xs text-slate-600 font-medium">
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

                          {/* Reefer / Target verified banner */}
                          {task.vehicle.tempType === 'REEFER' && !isIssue && (
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white border border-sky-200 text-[11px] font-semibold text-sky-900">
                              <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                              <span>Set Target: Chilled +4°C / Frozen -18°C Verified</span>
                            </div>
                          )}

                          {/* Discrepancy Alert Banner */}
                          {isIssue && (
                            <div className="p-2.5 rounded-lg bg-rose-100/80 border border-rose-300 text-xs text-rose-900 flex items-start space-x-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-rose-950">
                                  {task.issue?.description || 'Carton damage: Waiting for authorization'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Ready for Dispatch Note */}
                          {isReady && (
                            <div className="space-y-1 text-xs text-slate-600">
                              <p className="font-medium">
                                Seal: #{task.sealNumber || 'SL-9942'} • Driver: {task.driver?.name || 'N. Perera'}
                              </p>
                              <div className="flex items-center space-x-1 text-blue-700 font-semibold text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Manifest signed & digital dispatch clearance issued</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar Section */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-600">{task.progress.label}</span>
                            <span
                              className={
                                isIssue
                                  ? 'text-rose-700'
                                  : isReady
                                    ? 'text-slate-900 font-bold'
                                    : 'text-sky-700'
                              }
                            >
                              {task.progress.loadedItems} / {task.progress.totalItems} items ({task.progress.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
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

                        {/* Action Button */}
                        <div>
                          {isNotStarted && (
                            <button
                              id={`start-loading-btn-${task.id}`}
                              onClick={() => navigate(`/loader/tasks/${task.id}`)}
                              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition"
                            >
                              <span>▶ Start Loading</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}

                          {task.status === LoadingStatus.IN_PROGRESS && (
                            <button
                              id={`continue-loading-btn-${task.id}`}
                              onClick={() => navigate(`/loader/tasks/${task.id}`)}
                              className="w-full py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition"
                            >
                              <Layers className="w-4 h-4" />
                              <span>Continue Loading →</span>
                            </button>
                          )}

                          {isIssue && (
                            <button
                              id={`review-issue-btn-${task.id}`}
                              onClick={() => navigate(`/loader/tasks/${task.id}`)}
                              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                            >
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>Review Issue & Re-scan</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              id={`view-manifest-btn-${task.id}`}
                              onClick={() => navigate(`/loader/tasks/${task.id}`)}
                              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-600" />
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

        {/* Floating Action Button: Scan Bay / Parcel */}
        <div className="fixed sm:absolute bottom-16 right-4 sm:right-6 z-30">
          <button
            id="fab-scan-bay-parcel"
            onClick={() => {
              if (filteredTasks.length > 0) {
                navigate(`/loader/tasks/${filteredTasks[0].id}`);
              }
            }}
            className="flex items-center space-x-2 px-4 py-3 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 border border-slate-700 active:scale-95 transition"
            title="Scan Bay or Parcel Barcode"
          >
            <QrCode className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-xs sm:text-sm tracking-wide">Scan Bay / Parcel</span>
          </button>
        </div>

        {/* Tablet / Mobile Bottom Navigation Bar */}
        <div className="border-t border-slate-200 bg-white px-6 py-2.5 flex items-center justify-around text-xs font-semibold text-slate-500 z-20">
          <button className="flex flex-col items-center text-sky-700 space-y-0.5">
            <ListTodo className="w-5 h-5" />
            <span className="text-[11px] font-bold">Tasks</span>
          </button>
          <button
            onClick={() => {}}
            className="flex flex-col items-center hover:text-slate-800 space-y-0.5 transition"
          >
            <Truck className="w-5 h-5" />
            <span className="text-[11px]">Vehicles</span>
          </button>
          <button
            onClick={() => setActiveTab('LOADING')}
            className="flex flex-col items-center hover:text-slate-800 space-y-0.5 transition relative"
          >
            <div className="relative">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              {data && data.summary.discrepancies > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600" />
              )}
            </div>
            <span className="text-[11px] text-rose-700 font-bold">Issues</span>
          </button>
          <button
            onClick={() => {}}
            className="flex flex-col items-center hover:text-slate-800 space-y-0.5 transition"
          >
            <User className="w-5 h-5" />
            <span className="text-[11px]">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
