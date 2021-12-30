import {
  get,
  emitEvents,
  batchGet,
  batchPut,
} from "@TestSls/fulfillment-utils";
import {
  IShipmentBatch,
  ITransaction,
  middleware,
} from "@TestSls/shippo-utils";
import type {
  IPregenOrderShipment,
  IPregenTransactionBatchMapInput,
  IPregenTransactionBatchMapData,
  IPregenShipmentBatchItem,
} from "../types";

const { PRODUCTION_EVENT_BUS, TABLE_NAME, SHIPPO_KEY } = process.env;

/** Format shipment data into expected format for createShipment in Shipments service */
const buildCreateShipmentEvents = (
  shipments: IPregenOrderShipment[],
  batch: IPregenShipmentBatchItem
) =>
  shipments.map((shipment) => ({
    ...shipment,
    rate: {
      servicelevel: {
        token: batch.batch_shipment.default_servicelevel_token,
      },
    },
  }));

/** Publish events to trigger createShipment lambda in Shipments service */
const emitResults = async (
  shipments: IPregenOrderShipment[],
  batchId: string
) => {
  const batch = await get<IPregenShipmentBatchItem>(TABLE_NAME, batchId);
  if (batch === false) {
    throw new Error(`Unable to find batch by id: ${batchId}`);
  }
  await emitEvents(
    PRODUCTION_EVENT_BUS,
    buildCreateShipmentEvents(shipments, batch),
    "Shipping label purchased"
  );
};

/** Retrieve transaction data for each individual shipment */
const matchShipmentsToTransaction = async (
  shippo: any,
  shipments: IPregenOrderShipment[]
): Promise<IPregenOrderShipment[]> => {
  const transactionIds: string[] = shipments.map(
    (shipment) => shipment.shipment?.transaction
  );

  const transactions: ITransaction[] = await Promise.all(
    transactionIds.map((id) => shippo.transaction.retrieve(id))
  );

  const newShipmentData: IPregenOrderShipment[] = shipments.map((shipment) => {
    const transaction = transactions.find(
      ({ object_id }) => shipment.shipment.transaction === object_id
    );
    return { ...shipment, transaction };
  });
  return newShipmentData;
};

export const retrieveTransactions = async (
  shippo: any,
  event: IPregenTransactionBatchMapInput
) => {
  console.log(JSON.stringify(event));
  const { PK, batchId } = event;
  const group = await get<IPregenTransactionBatchMapData>(TABLE_NAME, PK);
  if (group === false) {
    throw new Error(`Unable to find shipment batch group data with id: ${PK}`);
  }
  const shipments = await batchGet<IPregenOrderShipment>(
    TABLE_NAME,
    group.shipment_keys
  );
  if (shipments === false) {
    throw new Error(`Unable to find shipments by keys`);
  }
  const newShipmentData = await matchShipmentsToTransaction(shippo, shipments);
  /** Save transaction data to dynamo table */
  await batchPut(TABLE_NAME, newShipmentData);
  /** Get parent shipment batch data */
  const batch = await get<IShipmentBatch>(TABLE_NAME, batchId);
  if (batch === false) {
    throw new Error(`Unable to find batch by id: ${batchId}`);
  }
  await emitResults(newShipmentData, batchId);
};
export const handler = middleware(
  SHIPPO_KEY,
  async (client: any, event: IPregenTransactionBatchMapInput) =>
    retrieveTransactions(client, event)
);
