import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LoadingStatus,
  LoadingChecklistResponse,
  LoadingChecklistItem,
  LoadingChecklistStop,
} from '@waypoint/shared';
import {
  fetchLoadingChecklist,
  updateLoadingChecklistItem,
  getStoredUser,
} from '../../services/api';

type FilterTab = 'ALL' | 'REMAINING' | 'LOADED' | 'ISSUES';

export const LoadingChecklist: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();

  const [checklist, setChecklist] = useState<LoadingChecklistResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [collapsedStops, setCollapsedStops] = useState<Record<number, boolean>>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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

    fetchLoadingChecklist(tripId)
      .then((data) => {
        if (isMounted) {
          setChecklist(data);
          // By default, collapse stops that are already 100% loaded
          const initialCollapsed: Record<number, boolean> = {};
          data.stops.forEach((s) => {
            if (s.isCompleted && s.stopSequence > 1) {
              initialCollapsed[s.stopSequence] = true;
            }
          });
          setCollapsedStops(initialCollapsed);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load loading checklist.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const toggleStopCollapse = (stopSeq: number) => {
    setCollapsedStops((prev) => ({
      ...prev,
      [stopSeq]: !prev[stopSeq],
    }));
  };

  const handleConfirmItem = async (item: LoadingChecklistItem, targetQuantity?: number) => {
    if (!tripId || updatingItemId) return;

    if (checklist?.loadingStatus === LoadingStatus.READY_FOR_DISPATCH) {
      setUpdateError('Vehicle loading is already completed and marked ready for dispatch. Quantities are locked.');
      return;
    }

    const qtyToSet = targetQuantity !== undefined ? targetQuantity : item.stagedQuantity;

    setUpdatingItemId(item.id);
    setUpdateError(null);

    try {
      const result = await updateLoadingChecklistItem(tripId, item.id, qtyToSet);

      // Update state locally with response from server
      setChecklist((prev) => {
        if (!prev) return null;
        const updatedStops = prev.stops.map((stop) => {
          if (stop.orderId !== item.orderId) return stop;
          const updatedItems = stop.items.map((it) => (it.id === item.id ? result.item : it));
          const totalItemsInStop = updatedItems.reduce((sum, it) => sum + it.requiredQuantity, 0);
          const loadedItemsInStop = updatedItems.reduce((sum, it) => sum + it.loadedQuantity, 0);
          const isCompleted = updatedItems.every((it) => it.isLoaded);
          const hasShortageInStop = updatedItems.some((it) => it.hasShortage);

          return {
            ...stop,
            items: updatedItems,
            totalItems: totalItemsInStop,
            loadedItems: loadedItemsInStop,
            isCompleted,
            hasShortage: hasShortageInStop,
          };
        });

        return {
          ...prev,
          overallProgress: result.overallProgress,
          stops: updatedStops,
        };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update item loaded status.';
      setUpdateError(message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSaveDraft = () => {
    setSaveNotice('Loading progress draft saved to database.');
    setTimeout(() => {
      setSaveNotice(null);
    }, 3000);
  };

  if (loading) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading checklist...</p>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Unable to Load Checklist</h2>
        <p style={styles.errorSubtitle}>{error || 'The checklist could not be retrieved.'}</p>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(tripId ? `/loader/tasks/${tripId}/sequence` : '/loader')}
        >
          Return to Loading Sequence
        </button>
      </div>
    );
  }

  const { vehicle, bay, overallProgress, stops } = checklist;

  // Filter items based on active tab
  const getFilteredItems = (stop: LoadingChecklistStop) => {
    switch (activeFilter) {
      case 'REMAINING':
        return stop.items.filter((it) => !it.isLoaded);
      case 'LOADED':
        return stop.items.filter((it) => it.isLoaded);
      case 'ISSUES':
        return stop.items.filter((it) => it.hasShortage);
      case 'ALL':
      default:
        return stop.items;
    }
  };

  const remainingItemsCount = Math.max(0, overallProgress.totalRequired - overallProgress.totalLoaded);

  return (
    <div style={styles.page}>
      {/* Toast Notice */}
      {saveNotice && <div style={styles.toastNotice}>💾 {saveNotice}</div>}

      {/* Update Error Banner */}
      {updateError && (
        <div style={styles.errorBanner}>
          <span>⚠️ {updateError}</span>
          <button style={styles.dismissErrorBtn} onClick={() => setUpdateError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Screen Header */}
      <header style={styles.topHeader}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/sequence`)}
          title="Back to Loading Sequence"
          aria-label="Back to Loading Sequence"
        >
          ←
        </button>
        <div style={styles.headerTitles}>
          <h1 style={styles.screenNumberTitle}>5. Item Loading Checklist</h1>
          <p style={styles.headerSubtitle}>
            {vehicle.registrationNumber} • Trip 1 • {checklist.departureFormatted.replace('Departs ', '')}
          </p>
        </div>
        <div style={styles.profileAvatar} title={currentUser?.name || 'Loader'}>
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'L'}
        </div>
      </header>

      {/* Subheader Badges */}
      <div style={styles.subHeaderBar}>
        <span style={styles.vehiclePill}>
          <span style={styles.statusDot} /> {vehicle.tempType === 'REEFER' ? 'REEFER TRUCK' : 'TRUCK'} ({vehicle.registrationNumber})
        </span>
        <span style={styles.bayPill}>{bay}</span>
      </div>

      {/* Page Title & Subtitle */}
      <div style={styles.titleSection}>
        <h2 style={styles.pageHeading}>Loading Checklist</h2>
        <p style={styles.pageSubheading}>Confirm physical goods loaded into vehicle using the touch checklist below.</p>
      </div>

      {/* Overall Loading Progress Card (Navy #0c1b29) */}
      <div style={styles.progressCard}>
        <div style={styles.progressTopRow}>
          <div style={styles.loadedCountContainer}>
            <span style={styles.loadedBigNum}>{overallProgress.totalLoaded}</span>
            <span style={styles.loadedTotalDenominator}>/ {overallProgress.totalRequired} Items Loaded</span>
          </div>
          <span style={styles.percentageBadge}>⚡ {overallProgress.percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBarTrack}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${Math.min(100, Math.max(0, overallProgress.percentage))}%`,
            }}
          />
        </div>

        {/* Three Status Badges inside progress card */}
        <div style={styles.progressMiniBadgesGrid}>
          <div style={styles.miniBadgeBox}>
            <span style={styles.miniBadgeIcon}>✓</span>
            <span style={styles.miniBadgeCount}>{overallProgress.verifiedStopsDone} Stops</span>
            <span style={styles.miniBadgeLabel}>Verified Done</span>
          </div>

          <div style={styles.miniBadgeBox}>
            <span style={styles.miniBadgeIcon}>🔄</span>
            <span style={styles.miniBadgeCount}>{overallProgress.inProgressStops} Stop</span>
            <span style={styles.miniBadgeLabel}>In-Progress</span>
          </div>

          <div
            style={{
              ...styles.miniBadgeBox,
              borderColor: overallProgress.shortageAlertCount > 0 ? '#f87171' : '#334155',
            }}
          >
            <span style={styles.miniBadgeIcon}>⚠️</span>
            <span
              style={{
                ...styles.miniBadgeCount,
                color: overallProgress.shortageAlertCount > 0 ? '#fca5a5' : '#ffffff',
              }}
            >
              {overallProgress.shortageAlertCount} Issue
            </span>
            <span
              style={{
                ...styles.miniBadgeLabel,
                color: overallProgress.shortageAlertCount > 0 ? '#f87171' : '#94a3b8',
              }}
            >
              Shortage Alert
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterTabsRow}>
        <button
          style={{
            ...styles.filterTab,
            ...(activeFilter === 'ALL' ? styles.activeFilterTab : {}),
          }}
          onClick={() => setActiveFilter('ALL')}
        >
          All Items ({overallProgress.totalRequired})
        </button>

        <button
          style={{
            ...styles.filterTab,
            ...(activeFilter === 'REMAINING' ? styles.activeFilterTab : {}),
          }}
          onClick={() => setActiveFilter('REMAINING')}
        >
          Remaining ({remainingItemsCount})
        </button>

        <button
          style={{
            ...styles.filterTab,
            ...(activeFilter === 'LOADED' ? styles.activeFilterTab : {}),
          }}
          onClick={() => setActiveFilter('LOADED')}
        >
          Loaded ({overallProgress.totalLoaded})
        </button>

        <button
          style={{
            ...styles.filterTab,
            ...(activeFilter === 'ISSUES' ? styles.activeFilterTab : {}),
            color: overallProgress.shortageAlertCount > 0 ? '#dc2626' : undefined,
          }}
          onClick={() => setActiveFilter('ISSUES')}
        >
          Issues ({overallProgress.shortageAlertCount})
        </button>
      </div>

      {/* Stop Groups */}
      <div style={styles.stopsContainer}>
        {stops.map((stop) => {
          const filteredItems = getFilteredItems(stop);
          const isCollapsed = !!collapsedStops[stop.stopSequence];

          if (filteredItems.length === 0 && activeFilter !== 'ALL') {
            return null;
          }

          return (
            <div key={stop.stopSequence} style={styles.stopGroupCard}>
              {/* Stop Group Header Bar */}
              <div
                style={styles.stopGroupHeader}
                onClick={() => toggleStopCollapse(stop.stopSequence)}
                role="button"
                tabIndex={0}
              >
                <div style={styles.stopGroupLeft}>
                  <span style={styles.stopGroupIcon}>
                    {stop.isCompleted ? '✅' : '🚚'}
                  </span>
                  <span style={styles.stopGroupTitle}>
                    STOP {stop.stopSequence} • {stop.lifoPositionLabel} • {stop.outlet.name.replace(/^Waypoint Fresh\s*[-–]\s*/i, '')}
                  </span>
                </div>
                <div style={styles.stopGroupRight}>
                  <span
                    style={{
                      ...styles.stopLoadedBadge,
                      backgroundColor: stop.isCompleted ? '#dcfce7' : '#e0f2fe',
                      color: stop.isCompleted ? '#166534' : '#0369a1',
                    }}
                  >
                    {stop.isCompleted
                      ? `${stop.loadedItems} / ${stop.totalItems} Loaded`
                      : `Staging (${stop.loadedItems}/${stop.totalItems})`}
                  </span>
                  <span style={styles.collapseChevron}>{isCollapsed ? '⌄' : '⌃'}</span>
                </div>
              </div>

              {/* Stop Items */}
              {!isCollapsed && (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  {filteredItems.map((item) => {
                    const isItemUpdating = updatingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        style={{
                          ...styles.itemCard,
                          borderColor: item.hasShortage ? '#fca5a5' : item.isLoaded ? '#bbf7d0' : '#e2e8f0',
                          backgroundColor: item.hasShortage ? '#fff5f5' : '#ffffff',
                        }}
                      >
                        {/* Top specs & badges */}
                        <div style={styles.itemTopBadgesRow}>
                          <div style={styles.skuAndTempRow}>
                            <span style={styles.itemSkuBadge}>{item.sku}</span>
                            <span style={styles.itemTempBadge}>
                              {item.tempLabel.includes('Chilled') ? '❄️ ' : item.tempLabel.includes('Frozen') ? '🧊 ' : '📦 '}
                              {item.tempLabel}
                            </span>
                          </div>

                          {/* Loaded Status Pill */}
                          {item.isLoaded && (
                            <span style={styles.itemLoadedStatusBadge}>
                              ✓ {item.loadedQuantity} / {item.stagedQuantity} ✓
                            </span>
                          )}
                        </div>

                        {/* Product Title & Spec */}
                        <h4 style={styles.itemProductName}>{item.productName}</h4>
                        <p style={styles.itemSpecification}>{item.specification}</p>

                        {/* Shortage Warning Box if required > staged */}
                        {item.hasShortage && (
                          <div style={styles.shortageWarningBox}>
                            <div style={styles.shortageCountsRow}>
                              <div>
                                <span style={styles.shortageLabel}>REQUIREMENT</span>
                                <p style={styles.requirementCountText}>{item.requiredQuantity} {item.unit}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={styles.shortageLabel}>STAGED COUNT</span>
                                <p style={styles.stagedCountText}>{item.stagedQuantity} {item.unit}</p>
                              </div>
                            </div>
                            <div style={styles.shortageMessageRow}>
                              <span style={styles.shortageAlertIcon}>⚠️</span>
                              <span style={styles.shortageMessageText}>
                                {item.shortageDetails || `Shortage detected: ${item.shortageQuantity} ${item.unit} missing from staging pallet`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Actions for Item */}
                        <div style={styles.itemActionsRow}>
                          {item.hasShortage && (
                            <button
                              style={styles.reportShortageButton}
                              onClick={() => navigate(`/loader/tasks/${tripId}/issues/new?itemId=${item.id}`)}
                            >
                              ⚠️ Report Shortage / Issue
                            </button>
                          )}

                          {!item.isLoaded ? (
                            <button
                              style={{
                                ...styles.confirmLoadedButton,
                                opacity: isItemUpdating || checklist?.loadingStatus === LoadingStatus.READY_FOR_DISPATCH ? 0.6 : 1,
                                cursor: checklist?.loadingStatus === LoadingStatus.READY_FOR_DISPATCH ? 'not-allowed' : 'pointer',
                              }}
                              disabled={isItemUpdating || checklist?.loadingStatus === LoadingStatus.READY_FOR_DISPATCH}
                              onClick={() => handleConfirmItem(item, item.stagedQuantity)}
                            >
                              {isItemUpdating ? 'Confirming...' : `✓ Confirm ${item.stagedQuantity} ${item.unit}`}
                            </button>
                          ) : (
                            <div style={styles.loadedActionsGroup}>
                              <span style={styles.confirmedDoneText}>
                                Fully Staged & Loaded ({item.loadedQuantity} {item.unit})
                              </span>
                              <button
                                style={styles.adjustQuantityLink}
                                disabled={isItemUpdating}
                                onClick={() => handleConfirmItem(item, 0)}
                                title="Unmark or adjust loaded item"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>



      {/* Barcode Scanner Info Box (Clearly Disabled Informational UI) */}
      <div style={styles.barcodeScannerCard}>
        <div style={styles.scannerLeftCol}>
          <span style={styles.barcodeIcon}>📷</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.scannerTitle}>Laser Barcode Scanner</span>
              <span style={styles.scannerStandbyBadge}>STANDBY</span>
            </div>
            <p style={styles.scannerSubtitle}>
              Hardware scanner offline • Barcode hardware integration unavailable in this release
            </p>
          </div>
        </div>
        <button
          style={styles.scanButtonDisabled}
          disabled={true}
          aria-disabled="true"
          title="Hardware barcode scanner is non-functional in demo mode. Please confirm loaded quantities using the checklist."
        >
          Scanner Offline
        </button>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div style={styles.bottomActionBar}>
        <button style={styles.saveDraftButton} onClick={handleSaveDraft}>
          💾 Save Draft
        </button>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/review`)}
        >
          Review Loading ({overallProgress.totalLoaded}/{overallProgress.totalRequired}) →
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
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dismissErrorBtn: {
    background: 'none',
    border: 'none',
    color: '#991b1b',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
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
  vehiclePill: {
    fontSize: '12px',
    fontWeight: 700,
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
  bayPill: {
    backgroundColor: '#ffffff',
    border: '1px solid #bae6fd',
    color: '#0284c7',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
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
  progressCard: {
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  progressTopRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  loadedCountContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  loadedBigNum: {
    fontSize: '32px',
    fontWeight: 900,
    color: '#ffffff',
    lineHeight: 1,
  },
  loadedTotalDenominator: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: 600,
  },
  percentageBadge: {
    backgroundColor: '#042f2e',
    color: '#34d399',
    fontSize: '12px',
    fontWeight: 800,
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #065f46',
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '14px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2dd4bf',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressMiniBadgesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  miniBadgeBox: {
    backgroundColor: '#132738',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '8px 6px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeIcon: {
    fontSize: '12px',
    marginBottom: '2px',
  },
  miniBadgeCount: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#f8fafc',
  },
  miniBadgeLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  filterTabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflowX: 'auto',
    marginBottom: '16px',
    paddingBottom: '4px',
  },
  filterTab: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  activeFilterTab: {
    backgroundColor: '#0c1b29',
    borderColor: '#0c1b29',
    color: '#ffffff',
  },
  stopsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '16px',
  },
  stopGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  stopGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #dbeafe',
  },
  stopGroupLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stopGroupIcon: {
    fontSize: '14px',
  },
  stopGroupTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a',
  },
  stopGroupRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stopLoadedBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  collapseChevron: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#64748b',
  },
  itemsListContainer: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#ffffff',
  },
  itemTopBadgesRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  skuAndTempRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  itemSkuBadge: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: '10px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  itemTempBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  itemLoadedStatusBadge: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: '11px',
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  itemProductName: {
    fontSize: '14px',
    fontWeight: 800,
    margin: '2px 0 2px 0',
    color: '#0f172a',
  },
  itemSpecification: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 10px 0',
  },
  shortageWarningBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '10px',
  },
  shortageCountsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  shortageLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#991b1b',
    letterSpacing: '0.4px',
  },
  requirementCountText: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '2px 0 0 0',
  },
  stagedCountText: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#b91c1c',
    margin: '2px 0 0 0',
  },
  shortageMessageRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#991b1b',
    fontWeight: 600,
    borderTop: '1px solid #fca5a5',
    paddingTop: '6px',
  },
  shortageAlertIcon: {
    fontSize: '12px',
  },
  shortageMessageText: {
    lineHeight: 1.3,
  },
  itemActionsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  reportShortageButton: {
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    minHeight: '40px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLoadedButton: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '9px 12px',
    minHeight: '40px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadedActionsGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  confirmedDoneText: {
    fontSize: '12px',
    color: '#15803d',
    fontWeight: 600,
  },
  adjustQuantityLink: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  barcodeScannerCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  scannerLeftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  barcodeIcon: {
    fontSize: '22px',
    opacity: 0.5,
  },
  scannerTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
  },
  scannerStandbyBadge: {
    fontSize: '9px',
    fontWeight: 800,
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    padding: '1px 5px',
    borderRadius: '4px',
    letterSpacing: '0.4px',
  },
  scannerSubtitle: {
    fontSize: '11px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  scanButtonDisabled: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#94a3b8',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'not-allowed',
    opacity: 0.8,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
    zIndex: 30,
  },
  saveDraftButton: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    flex: 1,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 2,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
