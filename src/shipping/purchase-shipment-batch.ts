import { update } from "@TestSls/fulfillment-utils";
import {
  IShipmentBatch,
  middleware,
  purchaseShipmentBatch,
} from "@TestSls/shippo-utils";
import type { BatchWebhookEvent } from "../types";
const { TABLE_NAME, SHIPPO_KEY } = process.env;
export const purchaseBatch = async (
  shippo: any,
  shipmentBatchObjectId: string
) => {
  const batch: IShipmentBatch = await shippo.batch.retrieve(
    shipmentBatchObjectId
  );
  if (batch.object_results.creation_failed > 0) {
    throw new Error(
      `Unable to create all shipments: ${batch.object_results.creation_failed} failed.`
    );
  }
  const batch_shipment: IShipmentBatch = await purchaseShipmentBatch(
    shippo,
    batch
  );
  await update(
    TABLE_NAME,
    batch_shipment.metadata,
    "SET #S = :s",
    { "#S": "batch_shipment" },
    { ":s": batch_shipment }
  );
};

export const eventhandler = middleware(
  SHIPPO_KEY,
  async (client: any, event: BatchWebhookEvent) =>
    purchaseBatch(client, event.detail.batchObjectId)
);
