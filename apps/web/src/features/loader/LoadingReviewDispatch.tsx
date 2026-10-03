import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LoadingReviewResponse,
  LoadingStatus,
} from '@waypoint/shared';
import { fetchLoadingReview, confirmReadyForDispatch } from '../../services/api';
import { useAuth } from '../auth/AuthContext';

export const LoadingReviewDispatch: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State
  const [reviewData, setReviewData] = useState<LoadingReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmation Modal & Action State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<boolean>(false);

  // Load Review Data
  useEffect(() => {
    let isMounted = true;

    async function loadReview() {
      if (!tripId) {
        setErrorMessage('Trip ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await fetchLoadingReview(tripId);
        if (isMounted) {
          setReviewData(data);
          if (data.loadingStatus === LoadingStatus.READY_FOR_DISPATCH) {
            setConfirmSuccess(true);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Unable to load loading review.';
          setErrorMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  // Handle Dispatch Readiness Confirmation
  const handleConfirmReady = async () => {
    if (!tripId) return;

    try {
      setIsConfirming(true);
      setConfirmError(null);

      const response = await confirmReadyForDispatch(tripId);

      // Update local review data to reflect new status
      if (reviewData) {
        setReviewData({
          ...reviewData,
          loadingStatus: response.loadingStatus,
          tripStatus: response.tripStatus,
          canDispatch: false,
        });
      }

      setConfirmSuccess(true);
      setShowConfirmModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to confirm vehicle ready for dispatch.';
      setConfirmError(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.stateTitle}>Loading Dispatch Review...</h2>
        <p style={styles.stateSubtitle}>Auditing manifest quantities, payload tolerances, and loading verification checklist</p>
      </div>
    );
  }

  // Error State
  if (errorMessage || !reviewData) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Unable to Load Dispatch Review</h2>
        <p style={styles.errorSubtitle}>{errorMessage || 'Trip not found or cross-depot access denied.'}</p>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(tripId ? `/loader/tasks/${tripId}/checklist` : '/loader')}
        >
          Return to Loading Checklist
        </button>
      </div>
    );
  }

  const {
    vehicle,
    driver,
    bay,
    plannedDepartureTime,
    departureFormatted,
    departureCountdown,
    progress,
    capacities,
    temperatureProfile,
    stops,
    unresolvedIssueCount,
    unresolvedIssues,
    finalChecklist,

    checklistComplete,
    canDispatch,
    loadingStatus,
  } = reviewData;

  const isReadyForDispatch = loadingStatus === LoadingStatus.READY_FOR_DISPATCH || confirmSuccess;
  const isDispatchBlocked = unresolvedIssueCount > 0;
  const isIncompleteLoading = !isDispatchBlocked && !checklistComplete;

  return (
    <div style={styles.page}>
      {/* Top Header */}
      <header style={styles.topHeader}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
          title="Back to Checklist"
          aria-label="Back to Loading Checklist"
        >
          ←
        </button>
        <div style={styles.headerTitles}>
          <h1 style={styles.screenNumberTitle}>7. Loading Review & Dispatch Ready</h1>
          <p style={styles.headerSubtitle}>
            {vehicle.registrationNumber} • Trip {reviewData.tripSequenceNumber} • {departureFormatted.replace('Departs ', '')}
          </p>
        </div>
        <div style={styles.profileAvatar} title={currentUser?.name || 'Loader'}>
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'L'}
        </div>
      </header>

      {/* Main Hero Card (Dispatch Readiness Overview) */}
      <div style={styles.heroCard}>
        <div style={styles.heroTopRow}>
          {isReadyForDispatch ? (
            <span style={styles.heroReadyPill}>
              <span style={styles.greenDot} /> READY FOR DISPATCH
            </span>
          ) : isDispatchBlocked ? (
            <span style={styles.heroBlockedPill}>
              <span style={styles.redDot} /> DISPATCH BLOCKED
            </span>
          ) : isIncompleteLoading ? (
            <span style={styles.heroIncompletePill}>
              <span style={styles.amberDot} /> LOADING INCOMPLETE
            </span>
          ) : (
            <span style={styles.heroReadyPill}>
              <span style={styles.greenDot} /> ALL CARGO VERIFIED
            </span>
          )}

          <div style={styles.depWindowBox}>
            <span style={styles.depWindowLabel}>DEP. WINDOW</span>
            <span style={styles.depWindowTime}>
              {plannedDepartureTime ? departureFormatted.replace('Departs ', '') : '05:45 AM'}
            </span>
            <span style={styles.depCountdownText}>⏱ {departureCountdown}</span>
          </div>
        </div>

        <h2 style={styles.heroHeading}>Loading Review & Dispatch Readiness</h2>
        <p style={styles.heroSubtitle}>
          Review manifest, vehicle payload utilization, and load sequence before dispatch.
        </p>
      </div>

      {/* Success Notification Banner (After Confirmation) */}
      {isReadyForDispatch && (
        <div style={styles.successBanner}>
          <div style={styles.successBannerIcon}>✓</div>
          <div>
            <h4 style={styles.successBannerTitle}>Vehicle Ready for Dispatch</h4>
            <p style={styles.successBannerText}>
              Loading has been confirmed and verified. Vehicle {vehicle.registrationNumber} is marked{' '}
              <strong>READY_FOR_DISPATCH</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Responsive Two-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vehicle & Payload Specs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Vehicle & Cargo Manifest Fill Card */}
          <div style={styles.contextCard}>
            <div style={styles.vehicleHeaderRow}>
              <div style={styles.vehicleInfoGroup}>
                <div style={styles.truckIconCircle}>🚚</div>
                <div>
                  <div style={styles.vehicleNameRow}>
                    <h3 style={styles.vehicleModelName}>
                      {vehicle.registrationNumber} • {vehicle.modelName}
                    </h3>
                    <span style={styles.plateBadge}>{vehicle.registrationNumber}</span>
                  </div>
                  <p style={styles.vehicleMetaSubtext}>
                    🧑‍✈️ Driver: {driver?.name || 'Sunimal Silva'} • 🚪 {bay}
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.cardDivider} />

            {/* Cargo Manifest Fill Progress */}
            <div style={styles.manifestFillSection}>
              <div style={styles.manifestFillHeader}>
                <span style={styles.manifestFillTitle}>
                  📦 Cargo Manifest Fill
                </span>
                <span style={styles.manifestFillStats}>
                  <strong>{progress.loadedItems} / {progress.totalItems} Items Loaded</strong> ({progress.percentage}%)
                </span>
              </div>
              <div style={styles.progressBarTrack}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${Math.min(100, progress.percentage)}%`,
                    backgroundColor: isDispatchBlocked ? '#ef4444' : progress.percentage >= 100 ? '#10b981' : '#0284c7',
                  }}
                />
              </div>
            </div>

            {/* Blocked Discrepancy Exception Card */}
            {isDispatchBlocked && (
              <div style={styles.discrepancyExceptionCard}>
                <div style={styles.exceptionTopRow}>
                  <span style={styles.exceptionWarningIcon}>⚠️</span>
                  <div>
                    <h4 style={styles.exceptionTitle}>
                      {unresolvedIssueCount} unresolved loading discrepancy requires review before dispatch.
                    </h4>
                    <p style={styles.exceptionBody}>
                      {unresolvedIssues[0]?.orderNumber || 'ORD-1042'}: {unresolvedIssues[0]?.description || 'Shortage reported from cold vault intake.'}
                    </p>
                    <p style={styles.exceptionInstruction}>
                      Dispatcher review required before vehicle clearance can be authorized.
                    </p>
                  </div>
                </div>
                <button
                  style={styles.exceptionNavButton}
                  onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
                >
                  Return to Checklist to Review Discrepancy →
                </button>
              </div>
            )}

            {/* Incomplete Loading Alert Card */}
            {isIncompleteLoading && (
              <div style={styles.incompleteAlertCard}>
                <div style={styles.exceptionTopRow}>
                  <span style={styles.amberWarningIcon}>⚠️</span>
                  <div>
                    <h4 style={styles.incompleteTitle}>
                      Checklist Incomplete ({progress.loadedItems}/{progress.totalItems} Units)
                    </h4>
                    <p style={styles.incompleteBody}>
                      Remaining items must be physically verified and loaded onto {vehicle.registrationNumber} prior to dispatch clearance sign-off.
                    </p>
                  </div>
                </div>
                <button
                  style={styles.incompleteNavButton}
                  onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
                >
                  Return to Checklist ({progress.loadedItems}/{progress.totalItems}) →
                </button>
              </div>
            )}
          </div>

          {/* Section: Payload & Temperature Profile */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Payload & Temperature Profile</h3>
            <span style={styles.sensorPill}>
              <span style={styles.blueDot} /> Vehicle Specs
            </span>
          </div>

          <div style={styles.telematicsGrid}>
            {/* 1. Gross Payload Card */}
            <div style={styles.telemetryCard}>
              <div style={styles.telemetryTopRow}>
                <span style={styles.telemetryLabel}>Gross Payload</span>
                <span style={styles.telemetryIcon}>⚖️</span>
              </div>
              <div style={styles.telemetryValueRow}>
                <span style={styles.telemetryValueNum}>
                  {capacities.usedWeightKg.toLocaleString()}
                </span>
                <span style={styles.telemetryUnit}>kg</span>
              </div>
              <span style={styles.telemetryLimit}>
                Limit: {capacities.maxWeightKg.toLocaleString()} kg
              </span>
              <div style={styles.telemetryPillRow}>
                <span style={{
                  ...styles.metricPill,
                  backgroundColor: capacities.isWeightCompliant ? '#eff6ff' : '#fee2e2',
                  color: capacities.isWeightCompliant ? '#0284c7' : '#dc2626',
                }}>
                  {capacities.isWeightCompliant
                    ? `Compliant +${capacities.weightMarginKg} kg margin`
                    : 'Overweight Violation'}
                </span>
              </div>
            </div>

            {/* 2. Cubing Volume Card */}
            <div style={styles.telemetryCard}>
              <div style={styles.telemetryTopRow}>
                <span style={styles.telemetryLabel}>Cubing Vol.</span>
                <span style={styles.telemetryIcon}>📐</span>
              </div>
              <div style={styles.telemetryValueRow}>
                <span style={styles.telemetryValueNum}>
                  {capacities.usedVolumeM3.toFixed(1)}
                </span>
                <span style={styles.telemetryUnit}>m³</span>
              </div>
              <span style={styles.telemetryLimit}>
                Limit: {capacities.maxVolumeM3.toFixed(1)} m³
              </span>
              <div style={styles.telemetryPillRow}>
                <span style={{
                  ...styles.metricPill,
                  backgroundColor: '#eff6ff',
                  color: '#0284c7',
                }}>
                  Optimal +{capacities.freeVolumeM3.toFixed(1)} m³ free
                </span>
              </div>
            </div>

            {/* 3. Chambers / Temperature Card */}
            <div style={styles.telemetryCard}>
              <div style={styles.telemetryTopRow}>
                <span style={styles.telemetryLabel}>Temperature Spec</span>
                <span style={styles.telemetryIcon}>❄️</span>
              </div>
              <div style={styles.telemetryValueRow}>
                <span style={styles.telemetryValueNum}>
                  {temperatureProfile.chamber1Temp}
                </span>
              </div>
              <span style={styles.telemetryLimit}>
                {temperatureProfile.chamber2Temp ? `Zone 2: ${temperatureProfile.chamber2Temp}` : 'Ambient Spec'}
              </span>
              <div style={styles.telemetryPillRow}>
                <span style={{
                  ...styles.metricPill,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                }}>
                  ● {temperatureProfile.statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sequence, Checklist & Actions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section: Sequence Audit (Reverse Loaded) */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Sequence Audit (Reverse Loaded)</h3>
            <span style={styles.dropsPill}>{stops.length} Drops</span>
          </div>

          <div style={styles.stopsStack}>
            {stops.map((stop) => (
              <div key={stop.stopSequence} style={styles.stopCard}>
                <div style={styles.stopNumberBadge}>
                  {stop.stopSequence}
                </div>
                <div style={styles.stopInfoCol}>
                  <h4 style={styles.stopTitle}>
                    Stop {stop.stopSequence}: {stop.outletName}
                  </h4>
                  <p style={styles.stopChamberText}>
                    {stop.chamberZone}
                  </p>
                </div>
                <span style={{
                  ...styles.stopStatusBadge,
                  backgroundColor: stop.hasDiscrepancy ? '#fee2e2' : '#dcfce7',
                  color: stop.hasDiscrepancy ? '#dc2626' : '#16a34a',
                }}>
                  {stop.hasDiscrepancy ? `! ${stop.statusBadge}` : `✓ ${stop.statusBadge}`}
                </span>
              </div>
            ))}
          </div>

          {/* Section: Pre-Departure Dispatch Checklist */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Final Loading Checklist</h3>
            <span style={styles.mandatoryStepsPill}>5 Verification Steps</span>
          </div>

          <div style={styles.gateChecklistStack}>
            {finalChecklist.map((step) => (
              <div key={step.id} style={styles.gateChecklistCard}>
                <div style={styles.gateCheckboxSquare}>
                  <span style={styles.gateCheckmark}>✓</span>
                </div>
                <div style={styles.gateTextCol}>
                  <div style={styles.gateTitleRow}>
                    <h4 style={styles.gateStepTitle}>{step.title}</h4>
                    {step.badge && (
                      <span style={styles.sealBadge}>{step.badge}</span>
                    )}
                  </div>
                  <p style={styles.gateStepDesc}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Area with Breathing Space */}
      <div className="sticky bottom-4 z-20 mt-6 sm:mt-8">
        <div className="bg-white/95 backdrop-blur border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            style={styles.returnTasksLink}
            onClick={() => navigate('/loader')}
          >
            ← Back to Today's Tasks
          </button>

          <div className="w-full sm:w-auto sm:min-w-[320px]">
            {isReadyForDispatch ? (
              <div style={styles.completedBadgeBox}>
                <span style={styles.completedCheckIcon}>✓</span>
                <span style={styles.completedText}>
                  Vehicle Ready for Dispatch
                </span>
              </div>
            ) : canDispatch ? (
              <button
                id="confirm-dispatch-ready-btn"
                style={styles.confirmReadyButton}
                onClick={() => setShowConfirmModal(true)}
              >
                ✓ Confirm Ready for Dispatch
              </button>
            ) : isDispatchBlocked ? (
              <div style={styles.blockedNoticeBox}>
                <span style={styles.blockedNoticeIcon}>🚫</span>
                <span style={styles.blockedNoticeText}>
                  Dispatch Blocked: Unresolved loading discrepancy requires review before dispatch.
                </span>
              </div>
            ) : (
              <div style={styles.blockedNoticeBox}>
                <span style={styles.blockedNoticeIcon}>⚠️</span>
                <span style={styles.blockedNoticeText}>
                  Dispatch Blocked: Complete loading all {progress.totalItems} items before vehicle can be marked ready for dispatch.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalTruckIcon}>🚚</div>
            <h3 style={styles.modalTitle}>Confirm Ready for Dispatch</h3>
            <p style={styles.modalText}>
              Confirm that loading has been completed and vehicle{' '}
              <strong>{vehicle.registrationNumber}</strong> is ready for dispatch.
            </p>
            <p style={styles.modalSubtext}>
              All {progress.loadedItems} units are loaded and verified according to the trip manifest.
            </p>

            {confirmError && (
              <div style={styles.modalErrorBanner}>
                <span>⚠️ {confirmError}</span>
              </div>
            )}

            <div style={styles.modalButtonsRow}>
              <button
                type="button"
                style={styles.modalCancelButton}
                onClick={() => setShowConfirmModal(false)}
                disabled={isConfirming}
              >
                Cancel
              </button>
              <button
                type="button"
                id="modal-confirm-ready-btn"
                style={{
                  ...styles.modalConfirmButton,
                  opacity: isConfirming ? 0.7 : 1,
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                }}
                onClick={handleConfirmReady}
                disabled={isConfirming}
              >
                {isConfirming ? 'Confirming Dispatch Readiness...' : 'Confirm Ready'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#f8fafc',
    minHeight: 'calc(100vh - 4rem)',
    padding: '24px 32px 64px 32px',
    maxWidth: '1536px',
    width: '100%',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
    position: 'relative',
    boxSizing: 'border-box',
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  backButton: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#334155',
  },
  headerTitles: {
    flex: 1,
    marginLeft: '16px',
  },
  screenNumberTitle: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '3px 0 0 0',
    fontWeight: 600,
  },
  profileAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  heroCard: {
    background: 'linear-gradient(135deg, #0c1b29 0%, #1e3a5f 100%)',
    borderRadius: '16px',
    padding: '18px',
    color: '#ffffff',
    marginBottom: '14px',
    boxShadow: '0 4px 12px rgba(12, 27, 41, 0.15)',
  },
  heroTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  heroReadyPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '6px',
    letterSpacing: '0.4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  heroBlockedPill: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '6px',
    letterSpacing: '0.4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  heroIncompletePill: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '6px',
    letterSpacing: '0.4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  greenDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#34d399',
    display: 'inline-block',
  },
  redDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    display: 'inline-block',
  },
  amberDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#b45309',
    display: 'inline-block',
  },
  blueDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    display: 'inline-block',
  },
  depWindowBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '8px 12px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  depWindowLabel: {
    fontSize: '10px',
    color: '#93c5fd',
    fontWeight: 700,
    letterSpacing: '0.5px',
    display: 'block',
  },
  depWindowTime: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#ffffff',
    display: 'block',
    lineHeight: 1.2,
  },
  depCountdownText: {
    fontSize: '11px',
    color: '#cbd5e1',
    fontWeight: 600,
    display: 'block',
    marginTop: '2px',
  },
  heroHeading: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  heroSubtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.4',
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '14px',
  },
  successBannerIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '16px',
    flexShrink: 0,
  },
  successBannerTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#065f46',
    margin: '0 0 2px 0',
  },
  successBannerText: {
    fontSize: '12px',
    color: '#047857',
    margin: 0,
    lineHeight: 1.4,
  },
  contextCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '14px',
    marginBottom: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  vehicleHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  truckIconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  vehicleNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  vehicleModelName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  plateBadge: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  vehicleMetaSubtext: {
    fontSize: '12px',
    color: '#64748b',
    margin: '3px 0 0 0',
  },
  cardDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '12px 0',
  },
  manifestFillSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  manifestFillHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manifestFillTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#334155',
  },
  manifestFillStats: {
    fontSize: '12px',
    color: '#64748b',
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  discrepancyExceptionCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '10px',
    padding: '12px',
    marginTop: '12px',
  },
  exceptionTopRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  exceptionWarningIcon: {
    fontSize: '20px',
  },
  exceptionTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#b91c1c',
    margin: '0 0 2px 0',
  },
  exceptionBody: {
    fontSize: '12px',
    color: '#991b1b',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  exceptionInstruction: {
    fontSize: '11px',
    color: '#7f1d1d',
    fontWeight: 600,
    margin: 0,
  },
  exceptionNavButton: {
    marginTop: '10px',
    width: '100%',
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  incompleteAlertCard: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '12px',
    marginTop: '12px',
  },
  amberWarningIcon: {
    fontSize: '20px',
  },
  incompleteTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#b45309',
    margin: '0 0 2px 0',
  },
  incompleteBody: {
    fontSize: '12px',
    color: '#92400e',
    margin: 0,
    lineHeight: 1.4,
  },
  incompleteNavButton: {
    marginTop: '10px',
    width: '100%',
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    marginTop: '14px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sensorPill: {
    fontSize: '11px',
    color: '#0284c7',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  dropsPill: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  mandatoryStepsPill: {
    fontSize: '11px',
    color: '#0284c7',
    fontWeight: 700,
  },
  telematicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '8px',
    marginBottom: '14px',
  },
  telemetryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  telemetryTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  telemetryLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  telemetryIcon: {
    fontSize: '12px',
  },
  telemetryValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  telemetryValueNum: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#0f172a',
  },
  telemetryUnit: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  telemetryLimit: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: '2px 0 6px 0',
  },
  telemetryPillRow: {
    marginTop: 'auto',
  },
  metricPill: {
    fontSize: '9px',
    fontWeight: 800,
    padding: '2px 5px',
    borderRadius: '4px',
    display: 'inline-block',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  stopsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '14px',
  },
  stopCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  stopNumberBadge: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInfoCol: {
    flex: 1,
  },
  stopTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  stopChamberText: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0,
  },
  stopStatusBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  },
  gateChecklistStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '14px',
  },
  gateChecklistCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  gateCheckboxSquare: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '2px',
    flexShrink: 0,
  },
  gateCheckmark: {
    fontSize: '12px',
    fontWeight: 900,
  },
  gateTextCol: {
    flex: 1,
  },
  gateTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  gateStepTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  sealBadge: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '4px',
  },
  gateStepDesc: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0,
  },
  clearanceCardsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  clearanceCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  clearanceAvatar: {
    fontSize: '20px',
  },
  shieldIconBox: {
    fontSize: '20px',
  },
  telematicsIconBox: {
    fontSize: '20px',
  },
  clearanceTextCol: {
    flex: 1,
  },
  clearanceTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  clearanceSubtext: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0,
  },
  authorizedBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  bottomActionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  confirmReadyButton: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(2, 132, 199, 0.25)',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '14px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  completedCheckIcon: {
    fontSize: '16px',
    fontWeight: 900,
  },
  completedText: {
    textAlign: 'center',
  },
  blockedNoticeBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px 16px',
    minHeight: '48px',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    lineHeight: 1.4,
  },
  blockedNoticeIcon: {
    fontSize: '18px',
  },
  blockedNoticeText: {
    flex: 1,
  },
  returnTasksLink: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    padding: '10px 16px',
    minHeight: '40px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#0284c7',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  stateTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  stateSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  errorIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#991b1b',
    margin: '0 0 6px 0',
  },
  errorSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  primaryActionButton: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTruckIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    fontSize: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  modalText: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: '0 0 6px 0',
  },
  modalSubtext: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4',
    margin: '0 0 16px 0',
  },
  modalErrorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '14px',
    textAlign: 'left',
  },
  modalButtonsRow: {
    display: 'flex',
    gap: '10px',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
  },
};
