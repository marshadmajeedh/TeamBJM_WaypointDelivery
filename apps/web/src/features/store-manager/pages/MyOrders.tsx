import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { deliveryDateKey } from '../types';
import { useDraft, useStoreData } from '../StoreContext';
import { Card, Feedback, OrderCard } from '../components/OrderComponents';
export function MyOrders() {
  const query = useStoreData();
  const { activeOutletId } = useDraft();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'ALL';
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [limit, setLimit] = useState(6);
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const outletOrders = query.data.orders.filter(
    (order) => !activeOutletId || order.outletId === activeOutletId
  );
  const orders = outletOrders.filter(
    (order) =>
      (!activeOutletId || order.outletId === activeOutletId) &&
      (status === 'ALL' || order.status === status) &&
      (!date || deliveryDateKey(order.requestedDeliveryDate) === date) &&
      `${order.orderNumber} ${order.outlet.name}`.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <>
      <div className="sm-row">
        <h1>My Orders</h1>
        <span className="sm-badge">Store hub live</span>
      </div>
      <p className="sm-muted">Manage and track all store replenishment runs.</p>
      <div className="sm-order-filters">
        <div className="sm-search">
          <Search size={17} />
          <input
            aria-label="Search orders"
            placeholder="Search by Order ID or outlet..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(6);
            }}
          />
        </div>
        <label className="sm-field">
          Delivery date
          <div className="sm-row">
            <input
              aria-label="Filter delivery date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setLimit(6);
              }}
            />
            {date && (
              <button className="sm-small-btn" onClick={() => setDate('')}>
                Clear
              </button>
            )}
          </div>
        </label>
      </div>
      <div className="sm-tabs" aria-label="Order status filters">
        {[
          ['ALL', 'All'],
          ['CONFIRMED', 'Awaiting Planning'],
          ['IN_TRANSIT', 'In Transit'],
          ['DEFERRED', 'Deferred'],
          ['DELIVERED', 'Delivered'],
          ['PARTIAL', 'Exceptions'],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={status === value}
            className={status === value ? 'active' : ''}
            onClick={() => {
              setParams(value === 'ALL' ? {} : { status: value });
              setLimit(6);
            }}
          >
            {label} (
            {outletOrders.filter((order) => value === 'ALL' || order.status === value).length})
          </button>
        ))}
      </div>
      <div className="sm-order-grid">
        {orders.slice(0, limit).map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
      {!orders.length && (
        <Card>
          <h2>No matching orders</h2>
          <p className="sm-muted">Try another filter or place a new replenishment order.</p>
          <Link className="sm-btn" to="/store/orders/new">
            Place New Order
          </Link>
        </Card>
      )}
      <p className="sm-center sm-muted">
        Showing {Math.min(limit, orders.length)} of {orders.length} orders
      </p>
      {limit < orders.length && (
        <button className="sm-btn sm-secondary" onClick={() => setLimit(limit + 6)}>
          Load more orders
        </button>
      )}
    </>
  );
}
