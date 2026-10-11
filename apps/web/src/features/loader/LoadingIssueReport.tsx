import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LoadingIssueContextResponse,
  LoadingIssueType,
  CreateLoadingIssueRequest,
} from '@waypoint/shared';
import { fetchLoadingIssueContext, createLoadingIssue } from '../../services/api';
import { useAuth } from '../auth/AuthContext';

export const LoadingIssueReport: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams] = useSearchParams();
  const requestedItemId = searchParams.get('itemId') || undefined;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State
  const [contextData, setContextData] = useState<LoadingIssueContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedIssueType, setSelectedIssueType] = useState<LoadingIssueType>('MISSING');
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [showTopBanner, setShowTopBanner] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Load context from API
  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      if (!tripId) {
        setErrorMessage('Trip ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await fetchLoadingIssueContext(tripId, requestedItemId);
        if (isMounted) {
          setContextData(data);
          // Pre-populate actual quantity and default explanation
          const initialActual = data.selectedItem.stagedQuantity;
          setActualQuantity(initialActual);
          const initialShortage = data.selectedItem.shortageQuantity;
          if (initialShortage > 0) {
            setNotes(
              `Only ${initialActual} ${data.selectedItem.unit} staged from cold vault. Staging supervisor confirmed batch run short by ${initialShortage} ${data.selectedItem.unit}. Cold chain intact on available stock.`
            );
          } else {
            setNotes('Physical discrepancy observed during dock loading.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Unable to load issue reporting context.';
          setErrorMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [tripId, requestedItemId]);

  // Derived discrepancy calculations
  const expectedQuantity = contextData?.selectedItem.expectedQuantity || 0;
  const unit = contextData?.selectedItem.unit || 'Cartons';
  const unitWeightKg = contextData?.selectedItem.unitWeightKg || 12;

  const discrepancyQuantity = useMemo(() => {
    if (selectedIssueType === 'MISSING') {
      return Math.max(0, expectedQuantity - actualQuantity);
    }
    // For Damaged, Temp Violation, Incorrect SKU: quantity affected
    return Math.max(0, expectedQuantity - actualQuantity) || (expectedQuantity > 0 ? 1 : 0);
  }, [selectedIssueType, expectedQuantity, actualQuantity]);

  const discrepancyWeightKg = Math.round(discrepancyQuantity * unitWeightKg);

  // Stepper handlers
  const handleDecrementActual = () => {
    setActualQuantity((prev) => Math.max(0, prev - 1));
  };

  const handleIncrementActual = () => {
    setActualQuantity((prev) => Math.min(expectedQuantity, prev + 1));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !contextData) return;

    if (notes.trim().length < 5) {
      setSubmitError('Physical explanation is mandatory and must contain at least 5 characters.');
      return;
    }

    if (discrepancyQuantity <= 0) {
      setSubmitError('Discrepancy quantity must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload: CreateLoadingIssueRequest = {
        itemId: contextData.selectedItem.id,
        type: selectedIssueType,
        quantity: discrepancyQuantity,
        description: notes.trim(),
        expectedQuantity,
        actualQuantity,
        photoUrl: `pallet_${contextData.bay.toLowerCase().replace(/[^a-z0-9]/g, '')}_shortage.jpg`,
      };

      await createLoadingIssue(tripId, payload);
      setSubmitSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to submit loading issue report.';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.spinner} />
        <h2 style={styles.stateTitle}>Loading Discrepancy Form...</h2>
        <p style={styles.stateSubtitle}>Retrieving order manifest and dock context</p>
      </div>
    );
  }

  // Error state
  if (errorMessage || !contextData) {
    return (
      <div style={styles.stateContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2 style={styles.errorTitle}>Unable to Load Issue Report</h2>
        <p style={styles.errorSubtitle}>{errorMessage || 'Trip context not found.'}</p>
        <button
          style={styles.primaryActionButton}
          onClick={() => navigate(tripId ? `/loader/tasks/${tripId}/checklist` : '/loader')}
        >
          Return to Loading Checklist
        </button>
      </div>
    );
  }

  const { vehicle, bay, departureFormatted, tripSequenceNumber, itemIndex, totalItemsCount, selectedItem } = contextData;
  const loaderSuffix = currentUser?.id ? currentUser.id.slice(-2) : '42';

  return (
    <div style={styles.page}>
      {/* Top Header */}
      <header style={styles.topHeader}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
          title="Back to Loading Checklist"
          aria-label="Back to Loading Checklist"
        >
          ←
        </button>
        <div style={styles.headerTitles}>
          <h1 style={styles.screenNumberTitle}>6. Report Loading Issue</h1>
          <p style={styles.headerSubtitle}>
            {vehicle.registrationNumber} • Trip {tripSequenceNumber} • {departureFormatted.replace('Departs ', '')}
          </p>
        </div>
        <div style={styles.profileAvatar} title={currentUser?.name || 'Loader'}>
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'L'}
        </div>
      </header>

      {/* Dismissible Top Notification Banner */}
      {showTopBanner && (
        <div style={styles.topBanner}>
          <div style={styles.bannerLeftCol}>
            <span style={styles.bannerIcon}>ℹ️</span>
            <span style={styles.bannerText}>
              Issue Flagged: Return to Checklist to finalize remaining items
            </span>
          </div>
          <button
            style={styles.bannerCloseButton}
            onClick={() => setShowTopBanner(false)}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title & Badge Section */}
      <div style={styles.titleSection}>
        <div style={styles.dockDiscrepancyBadgeRow}>
          <span style={styles.discrepancyPill}>
            <span style={styles.redDot} /> DOCK DISCREPANCY
          </span>
          <span style={styles.stepCounterText}>
            Step {itemIndex} of {totalItemsCount} items
          </span>
        </div>
        <h2 style={styles.pageHeading}>Report Loading Issue</h2>
        <p style={styles.pageSubheading}>
          Log physical discrepancies before vehicle departure for Central Dispatch review.
        </p>
      </div>

      {/* Main Issue Form */}
      <form onSubmit={handleSubmit} style={styles.formContainer}>
        {/* Context Card */}
        <div style={styles.contextCard}>
          {/* Vehicle & Bay Row */}
          <div style={styles.contextTopRow}>
            <div style={styles.vehicleInfoCol}>
              <span style={styles.truckIcon}>🚚</span>
              <div>
                <h3 style={styles.vehicleName}>
                  {vehicle.registrationNumber} ({vehicle.modelName})
                </h3>
                <p style={styles.tripBaySubtitle}>
                  Trip {tripSequenceNumber} • {bay}
                </p>
              </div>
            </div>
            <span style={styles.stagingBayBadge}>Staging {bay}</span>
          </div>

          <div style={styles.contextCardDivider} />

          {/* Order & Store Info */}
          <div style={styles.orderContextRow}>
            <div style={styles.orderPillsRow}>
              <span style={styles.orderNumberBadge}>{selectedItem.orderNumber}</span>
              <span style={styles.tempBadge}>{selectedItem.tempLabel}</span>
            </div>
            <h4 style={styles.outletNameHeading}>{selectedItem.outletName}</h4>
            <div style={styles.productRow}>
              <span style={styles.productIcon}>📦</span>
              <span style={styles.productNameText}>
                {selectedItem.productName} ({selectedItem.unitWeightKg}kg / unit)
              </span>
            </div>
            <div style={styles.expectedManifestRow}>
              <span style={styles.manifestLabel}>Expected Manifest:</span>
              <span style={styles.manifestValue}>
                {selectedItem.expectedQuantity} {unit.toLowerCase()} ({selectedItem.totalWeightKg} kg)
              </span>
            </div>
          </div>
        </div>

        {/* Section: Primary Issue Type */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Primary Issue Type</h3>
            <span style={styles.sectionActionHint}>Tap to select</span>
          </div>

          <div style={styles.issueTypeGrid}>
            {/* 1. Missing / Shortage */}
            <div
              style={{
                ...styles.issueTypeCard,
                ...(selectedIssueType === 'MISSING' ? styles.issueTypeCardSelected : {}),
              }}
              onClick={() => setSelectedIssueType('MISSING')}
              role="button"
              tabIndex={0}
              aria-label="Select Missing / Shortage"
            >
              <div style={styles.issueTypeTopRow}>
                <span style={styles.issueTypeIcon}>📦</span>
                {selectedIssueType === 'MISSING' && <span style={styles.checkIcon}>✓</span>}
              </div>
              <h4 style={{
                ...styles.issueTypeTitle,
                color: selectedIssueType === 'MISSING' ? '#ffffff' : '#0f172a',
              }}>
                Missing / Shortage
              </h4>
              <p style={{
                ...styles.issueTypeSubtitle,
                color: selectedIssueType === 'MISSING' ? '#93c5fd' : '#64748b',
              }}>
                Physical count lower
              </p>
            </div>

            {/* 2. Damaged Packaging */}
            <div
              style={{
                ...styles.issueTypeCard,
                ...(selectedIssueType === 'DAMAGED' ? styles.issueTypeCardSelected : {}),
              }}
              onClick={() => setSelectedIssueType('DAMAGED')}
              role="button"
              tabIndex={0}
              aria-label="Select Damaged Packaging"
            >
              <div style={styles.issueTypeTopRow}>
                <span style={styles.issueTypeIcon}>💥</span>
                {selectedIssueType === 'DAMAGED' && <span style={styles.checkIcon}>✓</span>}
              </div>
              <h4 style={{
                ...styles.issueTypeTitle,
                color: selectedIssueType === 'DAMAGED' ? '#ffffff' : '#0f172a',
              }}>
                Damaged Packaging
              </h4>
              <p style={{
                ...styles.issueTypeSubtitle,
                color: selectedIssueType === 'DAMAGED' ? '#93c5fd' : '#64748b',
              }}>
                Crushed / leaking
              </p>
            </div>

            {/* 3. Temperature Violation */}
            <div
              style={{
                ...styles.issueTypeCard,
                ...(selectedIssueType === 'TEMPERATURE_VIOLATION' ? styles.issueTypeCardSelected : {}),
              }}
              onClick={() => setSelectedIssueType('TEMPERATURE_VIOLATION')}
              role="button"
              tabIndex={0}
              aria-label="Select Temperature Violation"
            >
              <div style={styles.issueTypeTopRow}>
                <span style={styles.issueTypeIcon}>🌡️</span>
                {selectedIssueType === 'TEMPERATURE_VIOLATION' && <span style={styles.checkIcon}>✓</span>}
              </div>
              <h4 style={{
                ...styles.issueTypeTitle,
                color: selectedIssueType === 'TEMPERATURE_VIOLATION' ? '#ffffff' : '#0f172a',
              }}>
                Temperature Violation
              </h4>
              <p style={{
                ...styles.issueTypeSubtitle,
                color: selectedIssueType === 'TEMPERATURE_VIOLATION' ? '#93c5fd' : '#64748b',
              }}>
                Above limit
              </p>
            </div>

            {/* 4. Incorrect SKU */}
            <div
              style={{
                ...styles.issueTypeCard,
                ...(selectedIssueType === 'INCORRECT_SKU' ? styles.issueTypeCardSelected : {}),
              }}
              onClick={() => setSelectedIssueType('INCORRECT_SKU')}
              role="button"
              tabIndex={0}
              aria-label="Select Incorrect SKU"
            >
              <div style={styles.issueTypeTopRow}>
                <span style={styles.issueTypeIcon}>🏷️</span>
                {selectedIssueType === 'INCORRECT_SKU' && <span style={styles.checkIcon}>✓</span>}
              </div>
              <h4 style={{
                ...styles.issueTypeTitle,
                color: selectedIssueType === 'INCORRECT_SKU' ? '#ffffff' : '#0f172a',
              }}>
                Incorrect SKU
              </h4>
              <p style={{
                ...styles.issueTypeSubtitle,
                color: selectedIssueType === 'INCORRECT_SKU' ? '#93c5fd' : '#64748b',
              }}>
                Wrong batch / variant
              </p>
            </div>
          </div>
        </div>

        {/* Section: Discrepancy Breakdown */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Discrepancy Breakdown</h3>
            <span style={styles.sectionActionHint}>Unit: {unit}</span>
          </div>

          <div style={styles.breakdownRows}>
            {/* Expected on Manifest */}
            <div style={styles.breakdownRowContainer}>
              <div style={styles.breakdownLeft}>
                <span style={styles.breakdownIcon}>📋</span>
                <span style={styles.breakdownLabel}>Expected on Manifest</span>
              </div>
              <span style={styles.expectedValueBadge}>{expectedQuantity}</span>
            </div>

            {/* Physically Available Stepper */}
            <div style={styles.breakdownRowContainer}>
              <div style={styles.breakdownLeft}>
                <div>
                  <span style={styles.breakdownLabel}>Physically Available</span>
                  <p style={styles.breakdownSubtitle}>Staged at {bay}</p>
                </div>
              </div>
              <div style={styles.stepperContainer}>
                <button
                  type="button"
                  style={styles.stepperButton}
                  onClick={handleDecrementActual}
                  disabled={actualQuantity <= 0}
                  aria-label="Decrease physically available quantity"
                >
                  −
                </button>
                <span style={styles.stepperValue}>{actualQuantity}</span>
                <button
                  type="button"
                  style={styles.stepperButton}
                  onClick={handleIncrementActual}
                  disabled={actualQuantity >= expectedQuantity}
                  aria-label="Increase physically available quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Net Discrepancy / Shortage Alert Box */}
            <div style={styles.shortageResultBox}>
              <div style={styles.shortageLeftCol}>
                <span style={styles.shortageWarningIcon}>⚠️</span>
                <span style={styles.shortageResultLabel}>Net Discrepancy / Shortage</span>
              </div>
              <span style={styles.shortageResultValue}>
                -{discrepancyQuantity} {unit.toLowerCase()} ({discrepancyWeightKg} kg)
              </span>
            </div>
          </div>
        </div>

        {/* Section: Dock Loader Notes / Physical Explanation */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Dock Loader Notes / Physical Explanation</h3>
            <span style={styles.mandatoryPill}>Mandatory</span>
          </div>

          <textarea
            style={styles.notesTextarea}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide specific dock staging observations (e.g. cold vault shortages, crushed cartons, incorrect packaging batch numbers)..."
            maxLength={500}
            required
            aria-label="Dock loader notes"
          />

          <div style={styles.textareaFooter}>
            <span style={styles.loggedByText}>
              Logged by: {currentUser?.name || 'D. Jayasuriya'} (Loader #{loaderSuffix})
            </span>
            <span style={styles.charCountText}>{notes.length}/500</span>
          </div>
        </div>

        {/* Section: Photo Evidence */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeaderRow}>
            <div style={styles.photoTitleRow}>
              <h3 style={styles.sectionTitle}>Photo Evidence</h3>
              <span style={styles.attachedPill}>1 attached (Simulated)</span>
            </div>
          </div>
          <p style={styles.photoSubtitle}>
            Simulated staging pallet attachment • Physical camera hardware integration scheduled for future release
          </p>

          {/* Photo Attachment Preview Card */}
          <div style={styles.photoPreviewCard}>
            <div style={styles.photoLeftCol}>
              <div style={styles.palletThumbnail}>
                <span style={styles.palletThumbIcon}>📦</span>
              </div>
              <div>
                <div style={styles.photoFilenameRow}>
                  <span style={styles.photoFilename}>
                    pallet_{bay.toLowerCase().replace(/[^a-z0-9]/g, '')}_shortage.jpg
                  </span>
                  <span style={styles.greenCheckBadge}>✓</span>
                </div>
                <p style={styles.photoMetaText}>1.6 MB • Mock Attachment • Hardware camera integration offline</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Dispatch Review Required */}
        <div style={styles.notificationBroadcastCard}>
          <span style={styles.broadcastIcon}>📋</span>
          <div style={styles.broadcastContent}>
            <h4 style={styles.broadcastTitle}>DISPATCH REVIEW REQUIRED</h4>
            <p style={styles.broadcastText}>
              The reported issue has been recorded and must be reviewed before the vehicle is cleared for dispatch.
            </p>
          </div>
        </div>

        {/* Submission Error Banner */}
        {submitError && (
          <div style={styles.submitErrorAlert}>
            <span style={styles.submitErrorIcon}>⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting Issue for Dispatch Review...' : 'Submit Issue to Dispatcher →'}
        </button>

        {/* Secondary Cancel Link */}
        <button
          type="button"
          style={styles.cancelButton}
          onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
        >
          Cancel / Back to Loading Checklist
        </button>
      </form>

      {/* Success Modal */}
      {submitSuccess && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.successCheckIcon}>✓</div>
            <h3 style={styles.modalTitle}>Issue Recorded for Dispatch Review</h3>
            <p style={styles.modalText}>
              Discrepancy for <strong>{selectedItem.productName}</strong> ({discrepancyQuantity} {unit.toLowerCase()}) has been
              recorded. This issue will be available for Dispatcher review before vehicle dispatch. Trip loading status is updated to{' '}
              <span style={styles.issueReportedBadge}>ISSUE_REPORTED</span>.
            </p>
            <button
              style={styles.modalPrimaryButton}
              onClick={() => navigate(`/loader/tasks/${tripId}/checklist`)}
            >
              Return to Loading Checklist →
            </button>
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
    maxWidth: '1200px',
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
  topBanner: {
    backgroundColor: '#e0f2fe',
    border: '1px solid #bae6fd',
    borderRadius: '10px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  bannerLeftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bannerIcon: {
    fontSize: '14px',
  },
  bannerText: {
    fontSize: '12px',
    color: '#0369a1',
    fontWeight: 600,
  },
  bannerCloseButton: {
    background: 'none',
    border: 'none',
    color: '#0284c7',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
  },
  titleSection: {
    marginBottom: '16px',
  },
  dockDiscrepancyBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  discrepancyPill: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  redDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    display: 'inline-block',
  },
  stepCounterText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600,
  },
  pageHeading: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  pageSubheading: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.4',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  contextCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  contextTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfoCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  truckIcon: {
    fontSize: '24px',
  },
  vehicleName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  tripBaySubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  stagingBayBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  contextCardDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '12px 0',
  },
  orderContextRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  orderPillsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  orderNumberBadge: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  tempBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  outletNameHeading: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '2px 0 0 0',
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  },
  productIcon: {
    fontSize: '14px',
  },
  productNameText: {
    fontSize: '13px',
    color: '#334155',
    fontWeight: 600,
  },
  expectedManifestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
    fontSize: '12px',
  },
  manifestLabel: {
    color: '#64748b',
  },
  manifestValue: {
    color: '#0f172a',
    fontWeight: 700,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionActionHint: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  issueTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  issueTypeCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '96px',
    boxSizing: 'border-box',
  },
  issueTypeCardSelected: {
    backgroundColor: '#0c1b29',
    border: '1px solid #0c1b29',
  },
  issueTypeTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  issueTypeIcon: {
    fontSize: '20px',
  },
  checkIcon: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#38bdf8',
  },
  issueTypeTitle: {
    fontSize: '12px',
    fontWeight: 700,
    margin: '0 0 2px 0',
  },
  issueTypeSubtitle: {
    fontSize: '10px',
    margin: 0,
  },
  breakdownRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  breakdownRowContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
  },
  breakdownLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  breakdownIcon: {
    fontSize: '16px',
  },
  breakdownLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e293b',
  },
  breakdownSubtitle: {
    fontSize: '10px',
    color: '#64748b',
    margin: '1px 0 0 0',
  },
  expectedValueBadge: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '4px 12px',
  },
  stepperContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '2px',
  },
  stepperButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    fontSize: '16px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: '15px',
    fontWeight: 800,
    minWidth: '24px',
    textAlign: 'center',
    color: '#0f172a',
  },
  shortageResultBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortageLeftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  shortageWarningIcon: {
    fontSize: '16px',
  },
  shortageResultLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#991b1b',
  },
  shortageResultValue: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#dc2626',
  },
  mandatoryPill: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: '10px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  notesTextarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '12px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    outline: 'none',
    resize: 'vertical',
  },
  textareaFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '6px',
  },
  loggedByText: {
    fontSize: '11px',
    color: '#64748b',
  },
  charCountText: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 600,
  },
  photoTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  attachedPill: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  photoSubtitle: {
    fontSize: '11px',
    color: '#64748b',
    margin: '0 0 10px 0',
  },
  photoPreviewCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  photoLeftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  palletThumbnail: {
    width: '44px',
    height: '44px',
    borderRadius: '6px',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  palletThumbIcon: {
    opacity: 0.8,
  },
  photoFilenameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  photoFilename: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
  },
  greenCheckBadge: {
    color: '#16a34a',
    fontSize: '12px',
    fontWeight: 900,
  },
  photoMetaText: {
    fontSize: '10px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  retakeButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    color: '#0284c7',
    fontSize: '11px',
    fontWeight: 700,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  photoNoticeToast: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    marginBottom: '8px',
  },
  addSecondAngleButton: {
    width: '100%',
    padding: '8px',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  notificationBroadcastCard: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  broadcastIcon: {
    fontSize: '18px',
  },
  broadcastContent: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e40af',
    margin: '0 0 2px 0',
  },
  broadcastText: {
    fontSize: '11px',
    lineHeight: '1.4',
    color: '#1e3a8a',
    margin: 0,
  },
  submitErrorAlert: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitErrorIcon: {
    fontSize: '16px',
  },
  submitButton: {
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 20px',
    minHeight: '52px',
    fontSize: '15px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(12, 27, 41, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
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
  successCheckIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    fontSize: '28px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 10px 0',
  },
  modalText: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  issueReportedBadge: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontSize: '11px',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  modalPrimaryButton: {
    backgroundColor: '#0c1b29',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
};
