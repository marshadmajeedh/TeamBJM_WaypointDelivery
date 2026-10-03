import { ReceiptInput, StoreOrder, dateLabel, timeLabel } from '../types';
export function receiptData(notes: string | null): Partial<ReceiptInput> {
  try {
    const value = JSON.parse(notes || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return { notes: notes || '' };
  }
}
export function ReceiptDocument({ order }: { order: StoreOrder }) {
  const receipt = order.receiptConfirmation;
  if (!receipt) return null;
  const value = receiptData(receipt.notes);
  return (
    <article className="sm-print-document">
      <h2>WAYPOINT DELIVERY - INTAKE GATE SLIP</h2>
      <p>
        #{order.orderNumber} / {order.outlet.name}
      </p>
      <p>{order.outlet.address}</p>
      <p>
        Received {dateLabel(receipt.confirmedAt)} at {timeLabel(receipt.confirmedAt)}
      </p>
      <p>
        Status: {receipt.status} / Signed by: {value.signature || 'Store Manager'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Expected</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>
                {Array.isArray(value.received)
                  ? (value.received.find((received) => received.itemId === item.id)?.quantity ??
                    '-')
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Dock temperature:{' '}
        {value.dockTemperatureC != null ? `${value.dockTemperatureC} C` : 'Not recorded'}
      </p>
      <p>Issue: {value.issue || 'NONE'}</p>
      <p>{value.notes}</p>
      {value.proof && /^data:image\/(jpeg|png);base64,/.test(value.proof.dataUrl) && (
        <figure>
          <img className="sm-proof-image" src={value.proof.dataUrl} alt="Saved delivery proof" />
          <figcaption>{value.proof.name}</figcaption>
        </figure>
      )}
    </article>
  );
}
