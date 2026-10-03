import { z } from 'zod';
import { DeliveryOutcome, TripStatus } from './enums';

export const issueCategories = [
  'Access Blocked',
  'Store Closed',
  'Receiver Unavailable',
  'Shortage',
  'Damaged Goods',
  'Temperature Problem',
  'Other',
] as const;
export const failureReasons = [
  'Store Closed',
  'Receiver Unavailable',
  'Access Problem',
  'Delivery Rejected',
  'Damaged Goods',
  'Temperature Issue',
  'Other',
] as const;
const image = z
  .string()
  .max(2_800_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/);
export const outcomeSchema = z
  .object({
    outcome: z.nativeEnum(DeliveryOutcome),
    quantities: z
      .array(z.object({ itemId: z.string().min(1), delivered: z.number().int().nonnegative() }))
      .min(1),
    reason: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.outcome !== DeliveryOutcome.FULL && !value.reason?.trim())
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'A reason is required.' });
    if (
      value.outcome === DeliveryOutcome.FAILED &&
      !failureReasons.includes(value.reason as (typeof failureReasons)[number])
    )
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Choose an unable-to-deliver reason.',
      });
  });
const context = {
  tripId: z.string().min(1),
  stopId: z.string().min(1),
  orderId: z.string().min(1),
};
export const driverActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ISSUE'),
    ...context,
    issueType: z.enum(issueCategories),
    description: z.string().max(2000).optional(),
    photo: image.optional(),
    preventsDelivery: z.boolean(),
  }),
  z.object({ type: z.literal('ARRIVAL'), ...context }),
  z.object({
    type: z.literal('COMPLETE_DELIVERY'),
    ...context,
    result: outcomeSchema,
    proof: z.object({
      recipientName: z.string().trim().min(1).max(200),
      designation: z.string().max(200).optional(),
      signature: image.optional(),
      photos: z.array(image).max(2),
      confirmed: z.literal(true),
      notes: z.string().max(2000).optional(),
    }),
  }),
  z.object({ type: z.literal('START_TRIP'), tripId: z.string().min(1) }),
  z.object({ type: z.literal('FINISH_TRIP'), tripId: z.string().min(1) }),
]);
export const queuedDriverActionSchema = z.object({
  clientSyncId: z.string().uuid(),
  createdAt: z.string().datetime(),
  payload: driverActionSchema,
});
export type DriverAction = z.infer<typeof driverActionSchema>;
export type DeliveryResult = z.infer<typeof outcomeSchema>;
export type QueuedDriverAction = z.infer<typeof queuedDriverActionSchema>;
export type DriverIssue = Extract<DriverAction, { type: 'ISSUE' }> & {
  id: string;
  reportedAt: string;
  resolved: boolean;
};
export interface DriverItem {
  id: string;
  productName: string;
  quantity: number;
  unitWeightKg: number;
  tempRequirement: string;
}
export interface DriverStop {
  id: string;
  orderId: string;
  orderNumber: string;
  sequenceNumber: number;
  outlet: {
    name: string;
    address: string;
    contactPerson?: string | null;
    contactPhone?: string | null;
    deliveryWindowStart?: string | null;
    deliveryWindowEnd?: string | null;
  };
  items: DriverItem[];
  weightKg: number;
  outcome: DeliveryOutcome | null;
  arrivedAt: string | null;
  completedAt: string | null;
}
export interface DriverTrip {
  id: string;
  tripNumber: string;
  status: TripStatus;
  tripDate: string;
  vehicle: { registrationNumber: string; tempType: string };
  plannedDepartureTime: string | null;
  actualDepartureTime: string | null;
  completedTime: string | null;
  totalWeightKg: number;
  stops: DriverStop[];
}
export interface DriverSyncResult {
  clientSyncId: string;
  success: boolean;
  error?: string;
}
