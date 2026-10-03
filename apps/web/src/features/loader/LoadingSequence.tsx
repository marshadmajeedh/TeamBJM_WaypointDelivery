import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingSequenceResponse } from '@waypoint/shared';
import { fetchLoadingSequence, getStoredUser } from '../../services/api';

export const LoadingSequence: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [sequenceData, setSequenceData] = useState<LoadingSequenceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStops, setExpandedStops] = useState<Record<number, boolean>>({});
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const currentUser = getStoredUser();

  useEffect(() => {
    if (!tripId) {
      setError('Trip ID is missing.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchLoadingSequence(tripId)
      .then((data) => {
        if (isMounted) {
          setSequenceData(data);
          // Default all stops to expanded so manifest items are visible
          const initialExpanded: Record<number, boolean> = {};
          data.stops.forEach((s) => {
            initialExpanded[s.stopSequence] = true;
          });
          setExpandedStops(initialExpanded);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load loading sequence plan.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const toggleStopExpand = (stopSeq: number) => {
    setExpandedStops((prev) => ({
      ...prev,
      [stopSeq]: !prev[stopSeq],
    }));
  };

  const handlePrint = () => {
    setPrintNotice('Marshalling sheet queued for thermal dock printer (Bay Bay-04).');
    setTimeout(() => {
      window.print();
    }, 150);
    setTimeout(() => {
      setPrintNotice(null);
    }, 4000);
  };

  if (loading) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading sequence...</p>
      </div>
    );
  }

  if (error || !sequenceData) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Unable to Load Sequence</h2>
        <p style={styles.errorSubtitle}>{error || 'Trip loading sequence could not be retrieved.'}</p>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(tripId ? `/loader/tasks/${tripId}` : '/loader')}
        >
          Return to Vehicle Details
        </button>
      </div>
    );
  }

  const { vehicle, bay, stops, capacityPercentage, mandatoryRule, sequenceSummary } = sequenceData;
  const totalTripUnits = stops.reduce((sum, s) => sum + s.totalUnits, 0);

  return (
    <div style={styles.page}>
      {/* Print Notice Feedback */}
      {printNotice && (
        <div style={styles.toastNotice}>
          🖨️ {printNotice}
        </div>
      )}

      {/* Screen Header */}
      <header style={styles.topHeader}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/loader/tasks/${tripId}`)}
          title="Back to Vehicle Details"
          aria-label="Back to Vehicle Loading Details"
        >
          ←
        </button>
        <div style={styles.headerTitles}>
          <h1 style={styles.screenNumberTitle}>4. Loading Sequence</h1>
          <p style={styles.headerSubtitle}>
            {vehicle.registrationNumber} • Trip {sequenceData.tripSequenceNumber} • {sequenceData.departureFormatted.replace('Departs ', '')}
          </p>
        </div>
        <div style={styles.profileAvatar} title={currentUser?.name || 'Loader'}>
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'L'}
        </div>
      </header>

      {/* Subheader Badges */}
      <div style={styles.subHeaderBar}>
        <span style={styles.depotPill}>
          <span style={styles.statusDot} /> {bay} – CDC Peliyagoda
        </span>
        <span style={styles.lifoProtocolBadge}>LIFO Protocol ACTIVE</span>
      </div>

      {/* Page Title */}
      <div style={styles.titleSection}>
        <h2 style={styles.pageHeading}>Loading Sequence</h2>
        <p style={styles.pageSubheading}>Reverse-Order Truck Loading Guide</p>
      </div>

      {/* Trailer Cutaway Projection Card */}
      <div style={styles.projectionCard}>
        <div style={styles.projectionHeader}>
          <span style={styles.projectionTitle}>TRAILER CUTAWAY PROJECTION</span>
          <span style={styles.capacityBadge}>Capacity {capacityPercentage}% Filled</span>
        </div>

        {/* 3 Zone Truck Graphic */}
        <div style={styles.cutawayGraphicContainer}>
          {stops.map((stop) => {
            const isBulkhead = stop.lifoStagingOrder === 1;
            const isTailgate = stop.lifoStagingOrder === stops.length;
            const zoneName = isBulkhead ? 'ZONE 2' : isTailgate ? 'TAILGATE' : 'ZONE 1';
            const loadBadgeText = isBulkhead ? '1st IN' : isTailgate ? 'LAST IN' : '2nd IN';

            return (
              <div
                key={stop.stopSequence}
                style={{
                  ...styles.cutawayZoneBox,
                  backgroundColor: isTailgate ? '#fee2e2' : isBulkhead ? '#e0f2fe' : '#f0fdf4',
                  borderColor: isTailgate ? '#fca5a5' : isBulkhead ? '#7dd3fc' : '#86efac',
                }}
              >
                <span style={styles.cutawayZoneLabel}>{zoneName}</span>
                <span style={styles.cutawayStopName}>
                  Stop {stop.stopSequence} ({stop.outlet.name.replace(/^Waypoint Fresh\s*[-–]\s*/i, '')})
                </span>
                <span
                  style={{
                    ...styles.cutawayInBadge,
                    backgroundColor: isTailgate ? '#b91c1c' : '#0f172a',
                    color: '#ffffff',
                  }}
                >
                  {loadBadgeText}
                </span>
              </div>
            );
          })}
        </div>

        <div style={styles.cutawayLabelsRow}>
          <span>← Bulkhead (Front)</span>
          <span>Rear Shutter (Door) →</span>
        </div>
      </div>

      {/* Reverse-Stop Protocol Box */}
      <div style={styles.mandatoryCard}>
        <div style={styles.mandatoryHeaderRow}>
          <span style={styles.mandatoryIcon}>📋</span>
          <div style={styles.mandatoryBadgeRow}>
            <span style={styles.mandatoryPill}>REVERSE-STOP LOADING PROTOCOL</span>
            <span style={styles.isoStandardText}>Team BJM Loading Strategy</span>
          </div>
        </div>
        <p style={styles.mandatoryRuleText}>
          {mandatoryRule}
        </p>
        <div style={styles.sequenceFlowRow}>
          <span style={styles.flowIcon}>⇅</span>
          <span style={styles.flowText}>{sequenceSummary}</span>
        </div>
      </div>

      {/* Sequential Staging Queue Section */}
      <div style={styles.queueHeaderRow}>
        <h3 style={styles.queueSectionTitle}>Sequential Staging Queue</h3>
        <span style={styles.waypointsCountBadge}>{stops.length} Waypoints Required</span>
      </div>

      {/* Stop Cards in Reverse Delivery Order */}
      <div style={styles.stopsList}>
        {stops.map((stop) => {
          const isExpanded = !!expandedStops[stop.stopSequence];
          const isFirstToLoad = stop.lifoStagingOrder === 1;
          const isLastToLoad = stop.lifoStagingOrder === stops.length;

          const stepBadgeColor = isFirstToLoad ? '#065f46' : isLastToLoad ? '#dc2626' : '#1e3a8a';
          const priorityPillBg = isFirstToLoad ? '#042f2e' : isLastToLoad ? '#fee2e2' : '#0f172a';
          const priorityPillColor = isLastToLoad ? '#991b1b' : '#ffffff';

          return (
            <div key={stop.stopSequence} style={styles.stopCard}>
              {/* Step indicator header */}
              <div style={styles.stopCardTopBar}>
                <div style={styles.stepIndicatorRow}>
                  <span
                    style={{
                      ...styles.stepNumberBadge,
                      backgroundColor: stepBadgeColor,
                    }}
                  >
                    {stop.lifoStagingOrder}
                  </span>
                  <span style={styles.stepLabelText}>{stop.stepLabel}</span>
                </div>
                <span
                  style={{
                    ...styles.priorityPill,
                    backgroundColor: priorityPillBg,
                    color: priorityPillColor,
                  }}
                >
                  • {stop.priorityLabel}
                </span>
              </div>

              {/* Outlet info */}
              <h4 style={styles.stopOutletTitle}>
                STOP {stop.stopSequence}: {stop.outlet.name} ({stop.outlet.code})
              </h4>
              <div style={styles.stopLocationRow}>
                <span>📍 {stop.outlet.address}</span>
                <span style={isLastToLoad ? styles.firstStopEtaBadge : styles.normalEtaBadge}>
                  ⏱️ ETA {stop.etaFormatted}
                </span>
              </div>

              {/* Designated Hold Zone Box */}
              <div style={styles.designatedHoldBox}>
                <div style={styles.holdLeftCol}>
                  <span style={styles.holdIcon}>
                    {stop.designatedHold.temperature.includes('-') ? '❄️' : '🌡️'}
                  </span>
                  <div>
                    <span style={styles.holdZoneTag}>DESIGNATED HOLD</span>
                    <p style={styles.holdZoneName}>{stop.designatedHold.zone}</p>
                  </div>
                </div>
                <span style={styles.tempRequirementPill}>{stop.designatedHold.temperature}</span>
              </div>

              {/* Cargo weight and volume summary */}
              <div style={styles.cargoSummaryRow}>
                <span style={styles.cargoLabel}>Cargo: {stop.cargoDescription}</span>
                <span style={styles.cargoWeightText}>
                  {stop.weightKg.toLocaleString()} kg ({stop.volumeM3} m³)
                </span>
              </div>

              {/* Manifest Header & Items */}
              <div style={styles.manifestContainer}>
                <div style={styles.manifestHeaderRow}>
                  <span style={styles.manifestSectionLabel}>
                    {stop.isImmediateDispatch ? 'IMMEDIATE DISPATCH MANIFEST' : 'REQUIRED ITEM MANIFEST'}
                  </span>
                </div>

                {isExpanded && (
                  <div style={styles.itemsList}>
                    {stop.items.map((item) => (
                      <div key={item.id} style={styles.itemRow}>
                        <div style={styles.itemCheckIcon}>☑️</div>
                        <div style={styles.itemDetailsCol}>
                          <div style={styles.itemTitleRow}>
                            <span style={styles.itemNameText}>{item.productName}</span>
                            <span style={styles.itemPackageBadge}>{item.packageType}</span>
                          </div>
                          {item.instructions && (
                            <span style={styles.itemInstructionsText}>{item.instructions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer with SKU count & Toggle Expand */}
                <div style={styles.manifestFooterRow}>
                  <span style={styles.stagedPalletsCount}>
                    {stop.items.length} of {stop.items.length} SKU Pallets Staged
                  </span>
                  <button
                    style={styles.expandToggleButton}
                    onClick={() => toggleStopExpand(stop.stopSequence)}
                  >
                    {isExpanded ? 'Hide Details ⌃' : 'Details ⌄'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Actions */}
      <div style={styles.bottomActionBar}>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
        >
          Start Item Checklist ({totalTripUnits} Units) →
        </button>
        <button style={styles.secondaryPrintButton} onClick={handlePrint}>
          🖨️ Print Physical Marshalling Sheet
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '1536px',
    width: '100%',
    margin: '0 auto',
    padding: '24px 32px 64px 32px',
    backgroundColor: '#f8fafc',
    minHeight: 'calc(100vh - 4rem)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
    boxSizing: 'border-box',
  },
  stateContainer: {
    maxWidth: '800px',
    width: '100%',
    margin: '40px auto',
    padding: '32px 20px',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#0284c7',
    borderRadius: '50%',
    margin: '0 auto 16px auto',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '15px',
    color: '#64748b',
    fontWeight: 500,
  },
  errorIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  errorSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '20px',
  },
  toastNotice: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  backButton: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    width: '42px',
    height: '42px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0f172a',
  },
  headerTitles: {
    flex: 1,
    marginLeft: '16px',
  },
  screenNumberTitle: {
    fontSize: '24px',
    fontWeight: 900,
    margin: 0,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  headerSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '3px 0 0 0',
    fontWeight: 600,
  },
  profileAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  subHeaderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  depotPill: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0369a1',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
  },
  lifoProtocolBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#0c4a6e',
    letterSpacing: '0.5px',
  },
  titleSection: {
    marginBottom: '14px',
  },
  pageHeading: {
    fontSize: '28px',
    fontWeight: 900,
    margin: 0,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  pageSubheading: {
    fontSize: '14px',
    color: '#64748b',
    margin: '3px 0 0 0',
    fontWeight: 500,
  },
  projectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  projectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  projectionTitle: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  capacityBadge: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#0284c7',
  },
  cutawayGraphicContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '8px',
  },
  cutawayZoneBox: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '10px 6px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '72px',
    justifyContent: 'space-between',
  },
  cutawayZoneLabel: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#334155',
  },
  cutawayStopName: {
    fontSize: '11px',
    color: '#475569',
    fontWeight: 600,
    margin: '2px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  cutawayInBadge: {
    fontSize: '11px',
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: '4px',
  },
  cutawayLabelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600,
    marginTop: '6px',
  },
  mandatoryCard: {
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '18px',
  },
  mandatoryHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  mandatoryIcon: {
    fontSize: '16px',
  },
  mandatoryBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mandatoryPill: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.4px',
  },
  isoStandardText: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 600,
  },
  mandatoryRuleText: {
    fontSize: '13px',
    lineHeight: '1.4',
    margin: '0 0 10px 0',
    color: '#f1f5f9',
  },
  sequenceFlowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#38bdf8',
    fontWeight: 600,
    borderTop: '1px solid #1e293b',
    paddingTop: '8px',
  },
  flowIcon: {
    fontSize: '12px',
  },
  flowText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  queueHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  queueSectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  waypointsCountBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
  },
  stopsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  stopCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  stopCardTopBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stepIndicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  stepNumberBadge: {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '12px',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabelText: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '0.4px',
  },
  priorityPill: {
    fontSize: '10px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '12px',
    letterSpacing: '0.4px',
  },
  stopOutletTitle: {
    fontSize: '15px',
    fontWeight: 800,
    margin: '4px 0 6px 0',
    color: '#0f172a',
  },
  stopLocationRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#475569',
    marginBottom: '10px',
  },
  normalEtaBadge: {
    color: '#0369a1',
    fontWeight: 600,
  },
  firstStopEtaBadge: {
    color: '#dc2626',
    fontWeight: 700,
  },
  designatedHoldBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  holdLeftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  holdIcon: {
    fontSize: '18px',
  },
  holdZoneTag: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#0369a1',
    letterSpacing: '0.5px',
  },
  holdZoneName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0c4a6e',
    margin: 0,
  },
  tempRequirementPill: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  cargoSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '10px',
    color: '#334155',
    fontWeight: 600,
  },
  cargoLabel: {
    color: '#475569',
  },
  cargoWeightText: {
    fontWeight: 700,
    color: '#0f172a',
  },
  manifestContainer: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
  },
  manifestHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  manifestSectionLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.4px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '10px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: '#f8fafc',
    padding: '8px 10px',
    borderRadius: '6px',
  },
  itemCheckIcon: {
    fontSize: '14px',
    marginTop: '1px',
  },
  itemDetailsCol: {
    flex: 1,
  },
  itemTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0f172a',
  },
  itemNameText: {
    color: '#0f172a',
  },
  itemPackageBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#0369a1',
  },
  itemInstructionsText: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginTop: '2px',
  },
  manifestFooterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
    paddingTop: '4px',
  },
  stagedPalletsCount: {
    color: '#0369a1',
    fontWeight: 600,
  },
  expandToggleButton: {
    background: 'none',
    border: 'none',
    color: '#0284c7',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  bottomActionBar: {
    position: 'sticky',
    bottom: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    marginTop: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
    zIndex: 30,
  },
  primaryActionButton: {
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'center',
    flex: '2 1 240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPrintButton: {
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    flex: '1 1 200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
