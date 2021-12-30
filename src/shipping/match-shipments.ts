import { get, update } from "@TestSls/fulfillment-utils";
import { IShipmentBatch, middleware } from "@TestSls/shippo-utils";
import { IPregenShipmentBatchItem, ShipmentBatchMapInput } from "../types";

const { TABLE_NAME, SHIPPO_KEY } = process.env;
export const matchShipments = async (
  shippo: any,
  event: ShipmentBatchMapInput
) => {
  console.log(JSON.stringify(event));
  const { batch, batchId, index } = event;
  const data: IShipmentBatch = await shippo.batch.retrieve(
    batch.object_id,
    index
  );

  /** Get batch shipment keys from dynamo */
  const batchItem = await get<IPregenShipmentBatchItem>(TABLE_NAME, batchId);
  if (batchItem === false) {
    throw new Error(`Unable to find batch with id: ${batchId}`);
  }
  const orderShipmentKeys = batchItem.shipment_keys.slice(
    index * 100,
    (index + 1) * 100
  );

  const keys = await Promise.all(
    data.batch_shipments.results.map(async (shipment, i) => {
      const key = orderShipmentKeys[i];
      await update(
        TABLE_NAME,
        key,
        "SET #S = :s",
        { "#S": "shipment" },
        { ":s": shipment }
      );
      return key;
    })
  );
  return keys;
};

export const handler = middleware(
  SHIPPO_KEY,
  async (client: any, event: ShipmentBatchMapInput) =>
    matchShipments(client, event)
);
