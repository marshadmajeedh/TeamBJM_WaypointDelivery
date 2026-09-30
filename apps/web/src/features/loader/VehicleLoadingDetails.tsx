import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Phone,
  Snowflake,
  RotateCw,
  AlertTriangle,
  Radio,
  ChevronRight,
  ChevronDown,
  Layers,
  Thermometer,
} from 'lucide-react';
import { fetchVehicleLoadingDetails } from '../../services/api';
import { LoadingStatus, type VehicleLoadingDetails as VehicleLoadingDetailsType } from '@waypoint/shared';

export const VehicleLoadingDetails: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [details, setDetails] = useState<VehicleLoadingDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!tripId) {
      setError('Trip ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchVehicleLoadingDetails(tripId);
      setDetails(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load vehicle details.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [tripId]);

  const toggleStopExpand = (stopSeq: number) => {
    setExpandedStop(expandedStop === stopSeq ? null : stopSeq);
  };

  return (
    <div className="flex-1 bg-slate-900/40 p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-xl bg-slate-50 text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col min-h-[900px] relative">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              id="back-to-dashboard-btn"
              onClick={() => navigate('/loader')}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Back to loading tasks dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                3. Vehicle Loading Details
              </h1>
              {details && (
                <p className="text-xs text-slate-500 font-medium">
                  {details.vehicle.registrationNumber.slice(-6)} - Trip {details.tripSequenceNumber} • {details.departureFormatted}
                </p>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
            LD
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-sky-900 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
            <span>{actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-sky-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Container */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div
              id="vehicle-details-loading"
              className="py-20 flex flex-col items-center justify-center space-y-3"
            >
              <RotateCw className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">
                Loading vehicle loading specifications...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div
              id="vehicle-details-error"
              className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3 my-8"
            >
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <div>
                <p className="font-semibold text-sm">Vehicle / Trip Not Found</p>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
              </div>
              <button
                id="vehicle-details-back-error-btn"
                onClick={() => navigate('/loader')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Back to Dashboard
              </button>
            </div>
          )}

          {/* Details Content */}
          {!isLoading && !error && details && (
            <>
              {/* Gate Seal Countdown & Pre-Cool Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-sky-100/70 border border-sky-200 text-xs font-bold text-sky-900">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse" />
                  <span>{details.departureCountdown} to gate seal</span>
                </div>
                {details.preCoolTemp && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-sky-300 text-sky-800 font-mono text-[11px]">
                    Bay {details.bay.replace(/^BAY\s*/i, '')} Pre-Cool: {details.preCoolTemp}
                  </span>
                )}
              </div>

              {/* Main Vehicle Header Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black bg-slate-900 text-white tracking-wider">
                      {details.temperatureSpecs.vehicleTempType}{' '}
                      {Math.round(details.vehicle.maxWeightKg / 1000)}T
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {details.vehicle.registrationNumber}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {details.vehicle.modelName}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Morning Fresh Replenishment • {details.departureFormatted}
                  </p>
                </div>

                {/* Driver Info Card */}
                {details.driver && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
                        👨‍✈️
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            {details.driver.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {details.driver.roleTitle}
                        </p>
                      </div>
                    </div>
                    {details.driver.phone && (
                      <a
                        href={`tel:${details.driver.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-sky-200 text-sky-700 text-xs font-bold flex items-center space-x-1 hover:bg-sky-50 transition shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{details.driver.phone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* 2x2 Capacity & Specifications Grid */}
              <div className="grid grid-cols-2 gap-3" id="vehicle-capacities-grid">
                {/* 1. Weight Load */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>WEIGHT LOAD</span>
                    <span className="text-sky-700 font-extrabold text-[11px] px-1.5 py-0.2 rounded bg-sky-50 border border-sky-200">
                      {details.capacities.weightPercentage}%
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-black text-slate-900" id="capacity-used-weight">
                      {details.capacities.usedWeightKg.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {details.capacities.weightCapacityKg.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="bg-sky-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, details.capacities.weightPercentage)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2. Cube Volume */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>CUBE VOLUME</span>
                    <span className="text-sky-700 font-extrabold text-[11px] px-1.5 py-0.2 rounded bg-sky-50 border border-sky-200">
                      {details.capacities.volumePercentage}%
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-black text-slate-900" id="capacity-used-volume">
                      {details.capacities.usedVolumeM3.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {details.capacities.volumeCapacityM3.toFixed(1)} m³
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, details.capacities.volumePercentage)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3. Chamber / Temperature Specs */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {details.temperatureSpecs.isReefer
                      ? 'Dual Chill Chamber'
                      : 'Temperature Profile'}
                  </div>
                  <div className="mt-2 space-y-1">
                    {details.temperatureSpecs.chilledRequirement && (
                      <div className="flex items-center space-x-1 text-xs font-extrabold text-sky-800">
                        <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                        <span>{details.temperatureSpecs.chilledRequirement}</span>
                      </div>
                    )}
                    {details.temperatureSpecs.frozenRequirement && (
                      <div className="text-[11px] font-bold text-slate-600">
                        {details.temperatureSpecs.frozenRequirement}
                      </div>
                    )}
                    {!details.temperatureSpecs.isReefer && (
                      <div className="text-xs font-bold text-slate-800">
                        Ambient Cargo Hold
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Consignment Metrics */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Consignment
                  </div>
                  <div className="mt-2">
                    <div className="text-base font-black text-slate-900">
                      {details.consignment.outletCount} Outlets
                    </div>
                    <div className="text-[11px] font-bold text-sky-700">
                      {details.consignment.totalLineUnits} Total Line Units
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading Status Section */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                    <Layers className="w-4 h-4 text-sky-700" />
                    <span>Loading Status</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    • {details.loadingStatus.statusLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900" id="loaded-units-stat">
                    {details.loadingStatus.loadedUnits} / {details.loadingStatus.totalUnits} Units
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {details.loadingStatus.progressPercentage}% Loaded
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${details.loadingStatus.progressPercentage}%`,
                    }}
                  />
                </div>
              </div>

              {/* Reverse-Stop Loading Protocol Active Banner */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
                <div className="flex items-center space-x-2 text-sky-950 font-black text-xs uppercase tracking-wide">
                  <div className="p-1 rounded bg-sky-200 text-sky-800">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>Reverse-Stop Loading Protocol Active</span>
                </div>
                <p className="text-xs text-sky-900 leading-relaxed font-medium">
                  Load items according to planned stop sequence to enable rapid tail-lift unloading.
                  Items for Stop {details.stops.length} (
                  {details.stops[details.stops.length - 1]?.outlet.name.replace(
                    /^Waypoint Fresh\s*[-–]\s*/i,
                    ''
                  )}
                  ) enter the bulkhead first, followed by intermediate stops, and Stop 1 (
                  {details.stops[0]?.outlet.name.replace(/^Waypoint Fresh\s*[-–]\s*/i, '')}) staged
                  last at the tail.
                </p>
              </div>

              {/* Route Stops Sequence Section */}
              <div className="space-y-2.5 pb-20" id="route-stops-sequence-section">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Route Stops Sequence
                  </h3>
                  <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    LIFO Order Required
                  </span>
                </div>

                <div className="space-y-2.5">
                  {details.stops.map((stop) => {
                    const isExpanded = expandedStop === stop.stopSequence;

                    return (
                      <div
                        key={stop.stopSequence}
                        id={`stop-sequence-${stop.stopSequence}`}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                      >
                        <div
                          onClick={() => toggleStopExpand(stop.stopSequence)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center flex-shrink-0 border border-sky-200">
                              {stop.stopSequence}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {stop.outlet.name}{' '}
                                <span className="text-slate-400 font-normal">
                                  {stop.outlet.code}
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">
                                ETA {stop.outlet.deliveryWindow} •{' '}
                                <span className="text-sky-700 font-bold">
                                  {stop.lifoPositionLabel}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-right flex-shrink-0">
                            <div>
                              <span className="text-xs font-bold text-slate-900">
                                {stop.skuCount} SKUs
                              </span>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {stop.weightKg} kg
                              </p>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible SKU manifest preview */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/70 p-3 space-y-2">
                            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                              <span>Manifest Items ({stop.items.length})</span>
                              <span className="text-slate-500 font-medium">
                                Order: {stop.orderNumber}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {stop.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {item.productName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      {item.quantity} units • {item.unitWeightKg * item.quantity} kg
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-1">
                                    <Thermometer className="w-3 h-3 text-sky-600" />
                                    <span>{item.tempRequirement}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Sticky Action Buttons */}
              <div className="bg-white border-t border-slate-200 p-4 space-y-2.5 fixed sm:absolute bottom-0 left-0 right-0 z-20 shadow-lg">
                {details.loadingStatus?.status === LoadingStatus.READY_FOR_DISPATCH ? (
                  <button
                    id="view-review-ready-btn"
                    onClick={() => navigate(`/loader/tasks/${tripId}/review`)}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition"
                  >
                    <span>✓ Ready for Dispatch • View Gate Clearance</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="view-sequence-plan-btn"
                    onClick={() => navigate(`/loader/tasks/${tripId}/sequence`)}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.99] transition"
                  >
                    <span>View Loading Sequence & Marshalling Plan</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="inspect-sensors-btn"
                  onClick={() =>
                    setActionNotice(
                      `Pre-cool verification active: ${details.preCoolTemp || '3.8°C'}. Bay sensors normal.`
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center justify-center space-x-2 transition"
                >
                  <Radio className="w-3.5 h-3.5 text-sky-600" />
                  <span>Inspect Reefer Telematics & Bay Sensors</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
