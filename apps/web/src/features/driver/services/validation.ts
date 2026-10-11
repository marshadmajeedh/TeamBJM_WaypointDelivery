import { DeliveryOutcome, DeliveryResult, DriverStop, outcomeSchema } from '@waypoint/shared';
export function validateOutcome(stop: DriverStop, result: DeliveryResult): string | null {
  const parsed = outcomeSchema.safeParse(result);
  if (!parsed.success) return parsed.error.issues[0].message;
  if (
    result.quantities.length !== stop.items.length ||
    new Set(result.quantities.map((q) => q.itemId)).size !== stop.items.length
  )
    return 'Enter a quantity for every item.';
  if (
    stop.items.some((i) => {
      const q = result.quantities.find((q) => q.itemId === i.id);
      return !q || q.delivered > i.quantity;
    })
  )
    return 'Delivered quantity cannot exceed expected quantity.';
  if (
    result.outcome === DeliveryOutcome.FULL &&
    stop.items.some(
      (i) => result.quantities.find((q) => q.itemId === i.id)?.delivered !== i.quantity
    )
  )
    return 'Confirm all expected quantities for full delivery.';
  if (
    result.outcome === DeliveryOutcome.PARTIAL &&
    (!result.quantities.some((q) => q.delivered > 0) ||
      !stop.items.some(
        (i) => result.quantities.find((q) => q.itemId === i.id)!.delivered < i.quantity
      ))
  )
    return 'Partial delivery needs accepted goods and a shortage.';
  if (result.outcome === DeliveryOutcome.FAILED && result.quantities.some((q) => q.delivered !== 0))
    return 'Unable to deliver requires zero delivered quantities.';
  return null;
}
