import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Save, ArrowRight } from 'lucide-react';
import { useDraft, useStoreData } from '../StoreContext';
import { PageTitle } from '../components/StoreShell';
import { Card, Feedback, PayloadSummary, ProductItemCard } from '../components/OrderComponents';
import { today } from '../types';
export function CreateOrder() {
  const query = useStoreData();
  const { draft, setDraft, saveDraft, savingDraft, draftLoading, draftError, activeOutletId } =
    useDraft();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  if (!query.data || draftLoading)
    return (
      <Feedback
        loading={query.isPending || draftLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const { catalog, outlets } = query.data;
  const outletId = draft.outletId || activeOutletId || outlets[0]?.id || '';
  const items = catalog.map((product) => ({
    ...product,
    quantity: draft.items.find((item) => item.productId === product.id)?.quantity || 0,
  }));
  const changeQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000) return;
    setDraft({
      ...draft,
      outletId,
      items: [
        ...draft.items.filter((item) => item.productId !== productId),
        { productId, quantity },
      ].filter((item) => item.quantity > 0),
    });
  };
  const selected = items.filter((item) => item.quantity > 0);
  return (
    <>
      <PageTitle title="Create New Order" subtitle="Waypoint Logistic Dispatch" />
      <div className="sm-inset">
        <strong>Next-Day Order Cut-Off</strong>
        <p className="sm-muted">
          Submit your replenishment request early for the next available delivery run.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!selected.length || !outletId) {
            setNotice('Choose an outlet and add at least one item.');
            return;
          }
          setDraft({ ...draft, outletId });
          navigate('/store/orders/review');
        }}
      >
        <Card>
          <div className="sm-row">
            <h2>Order configuration</h2>
            <span className="sm-badge">Standard replenishment</span>
          </div>
          <label className="sm-field">
            Delivery destination
            <select
              value={outletId}
              onChange={(event) => setDraft({ ...draft, outletId: event.target.value })}
              required
            >
              <option value="" disabled>
                Select an outlet
              </option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sm-field">
            Requested delivery date
            <input
              type="date"
              required
              min={today()}
              value={draft.requestedDeliveryDate}
              onChange={(event) =>
                setDraft({ ...draft, requestedDeliveryDate: event.target.value })
              }
            />
          </label>
          <div className="sm-inset">
            <small>Manifest category</small>
            <select
              aria-label="Manifest category"
              value={draft.category || 'DAILY_REPLENISHMENT'}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value as typeof draft.category })
              }
            >
              <option value="DAILY_REPLENISHMENT">Daily Replenishment - Produce &amp; Dairy</option>
              <option value="COLD_CHAIN">Cold Chain Replenishment</option>
              <option value="DRY_GOODS">Dry Goods Restock</option>
            </select>
          </div>
        </Card>
        <div className="sm-section-title">
          <h2>
            Order Items <span className="sm-badge">{selected.length} SKUs</span>
          </h2>
          <span className="sm-muted">Select quantities below</span>
        </div>
        {items.map((item) => (
          <ProductItemCard
            key={item.id}
            item={item}
            pack={item.pack}
            controls={
              <div className="sm-quantity">
                <button
                  type="button"
                  aria-label={'Remove one ' + item.productName}
                  disabled={item.quantity === 0}
                  onClick={() => changeQuantity(item.id, item.quantity - 1)}
                >
                  <Minus size={15} />
                </button>
                <input
                  aria-label={item.productName + ' quantity'}
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={item.quantity}
                  onChange={(event) => changeQuantity(item.id, Number(event.target.value))}
                />
                <button
                  type="button"
                  aria-label={'Add one ' + item.productName}
                  disabled={item.quantity >= 1000}
                  onClick={() => changeQuantity(item.id, item.quantity + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
            }
          />
        ))}
        <label className="sm-field">
          Special receiving instructions
          <textarea
            rows={3}
            maxLength={1000}
            value={draft.receivingInstructions || ''}
            onChange={(event) => setDraft({ ...draft, receivingInstructions: event.target.value })}
            placeholder="Bay access, receiving hours, or handling instructions"
          />
        </label>
        <PayloadSummary items={selected} />
        {draftError && (
          <p className="sm-error">
            Server draft could not be loaded. Your current edits remain available:{' '}
            {draftError.message}
          </p>
        )}
        {notice && (
          <p role="status" className="sm-inset">
            {notice}
          </p>
        )}
        <div className="sm-actions">
          <button
            type="button"
            className="sm-btn sm-secondary"
            disabled={savingDraft || !selected.length || !outletId}
            onClick={async () => {
              try {
                await saveDraft({ ...draft, outletId });
                setNotice('Draft saved to your account.');
              } catch (error) {
                setNotice(error instanceof Error ? error.message : 'Draft could not be saved.');
              }
            }}
          >
            <Save size={16} /> {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="sm-btn" type="submit">
            Review Order <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </>
  );
}
