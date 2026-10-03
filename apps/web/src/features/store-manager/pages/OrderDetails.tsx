import { Link, useParams } from 'react-router-dom';
import { useStoreOrder } from '../StoreContext';
import { PageTitle } from '../components/StoreShell';
import {
  Card,
  Feedback,
  PayloadSummary,
  ProductItemCard,
  StatusBadge,
} from '../components/OrderComponents';
import { dateLabel } from '../types';
export function OrderDetails() {
  const { id = '' } = useParams();
  const query = useStoreOrder(id);
  if (!query.data)
    return (
      <Feedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  return (
    <>
      <PageTitle title="Order Details" back="/store/orders" />
      <Card>
        <div className="sm-row">
          <h2>#{order.orderNumber}</h2>
          <StatusBadge status={order.status} />
        </div>
        <h2>{order.outlet.name}</h2>
        <p>{order.outlet.address}</p>
        <p className="sm-muted">Requested: {dateLabel(order.requestedDeliveryDate)}</p>
      </Card>
      {order.items.map((item) => (
        <ProductItemCard key={item.id} item={item} />
      ))}
      <PayloadSummary items={order.items} dark />
      {order.workflow?.receivingInstructions && (
        <Card>
          <h2>Receiving Instructions</h2>
          <p>{order.workflow.receivingInstructions}</p>
        </Card>
      )}
      <Link className="sm-btn" to={`/store/orders/${id}/track`}>
        Track Order Status
      </Link>
      {order.status === 'DEFERRED' && (
        <Link className="sm-btn sm-secondary" to={`/store/orders/${id}/deferred`}>
          View Deferral Notice
        </Link>
      )}
    </>
  );
}
