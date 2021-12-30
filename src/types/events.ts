import type { BrandName } from "@TestSls/fulfillment-utils";
import type { BatchEventWebhookData } from "@TestSls/shippo-utils";
import type { EventBridgeEvent } from "aws-lambda";

export type BatchWebhookEvent = EventBridgeEvent<
  BatchEventWebhookData["event"],
  BatchEventWebhookData & { batchObjectId: string }
>;

export interface IPregenOrderEventDetail {
  salesOrderIds: number[];
  /** Vendor/channel name */
  channel: string;
  brand: BrandName;
  brandEmail: string;
  eventTime: string;
}

export type PregenBatchCreationEvent = EventBridgeEvent<
  "Pregen orders created",
  IPregenOrderEventDetail
>;
