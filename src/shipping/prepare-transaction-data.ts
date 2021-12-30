import { get, batchPut } from "@TestSls/fulfillment-utils";
import { arrayChunks } from "@TestSls/util/lib/array-utils";
import type {
  IPregenTransactionBatchInput,
  IPregenShipmentBatchItem,
  IPregenTransactionBatchMapData,
  IPregenTransactionBatchMapInput,
} from "../types";
const { TABLE_NAME } = process.env;

export const prepareTransactionData = async (
  event: IPregenTransactionBatchInput
) => {
  console.log(JSON.stringify(event));
  const batchData = await get<IPregenShipmentBatchItem>(
    TABLE_NAME,
    event.batchId
  );
  if (batchData === false) {
    throw new Error(`Unable to find batch with id: ${event.batchId}`);
  }
  /** Group shipment data keys into groups of 10 for map iteration */
  const eventGroups: IPregenTransactionBatchMapData[] = arrayChunks(
    batchData.shipment_keys,
    10
  ).map((shipment_keys: string[], index) => ({
    shipment_keys,
    batchId: event.batchId,
    groupId: index,
    PK: `${event.batchId}_Group${index}`,
  }));
  /** Batch event groups to max size for bulk dynamo put */
  const batchPuts = arrayChunks(eventGroups, 25);
  await Promise.all(batchPuts.map((puts) => batchPut(TABLE_NAME, puts)));

  /** Return batch ID and group data row key  */
  const groups: IPregenTransactionBatchMapInput[] = eventGroups.map(
    (group) => ({
      batchId: event.batchId,
      PK: group.PK,
    })
  );
  return { groups };
};
export const handler = prepareTransactionData;
