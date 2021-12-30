import { getBrandAddress, get, put } from "@TestSls/fulfillment-utils";
import { getBatchId } from "../lib/batch";
import {
  createParcel,
  createShipmentBatch,
  middleware,
} from "@TestSls/shippo-utils";
import type {
  IServiceLevel,
  IShipmentBatchShipment,
  IShipmentBatchCreateParams,
} from "@TestSls/shippo-utils";
import type {
  IPregenShipmentBatchItem,
  PregenBatchCreationEvent,
} from "../types";

const { TABLE_NAME, SHIPPO_KEY } = process.env;

/** Create shipment batch from wholesale pregen sales order data */
const createBatch = async (client: any, event: PregenBatchCreationEvent) => {
  const {
    detail: { salesOrderIds, brand, channel, eventTime },
  } = event;
  const [brandAddress, serviceLevelConfig] = await Promise.all([
    getBrandAddress(TABLE_NAME, brand),
    get(TABLE_NAME, "initialInbound_standard"),
  ]);
  const batchId = getBatchId(brand, channel, eventTime);
  const [serviceLevel]: [IServiceLevel] = serviceLevelConfig.serviceLevels;
  const batch_shipments: IShipmentBatchShipment[] = salesOrderIds.map((id) => ({
    shipment: {
      address_from: {
        ...brandAddress,
        name: `${channel} Order`,
      },
      address_to: brandAddress,
      parcels: [createParcel("initialInbound", "standard")],
      metadata: `${id}_${batchId}`,
    },
  }));
  const shipmentBatch: IShipmentBatchCreateParams = {
    default_carrier_account: serviceLevel.carrier_account_id,
    default_servicelevel_token: serviceLevel.token,
    batch_shipments,
    label_filetype: "PNG",
    metadata: batchId,
  };
  const batch = await createShipmentBatch(client, shipmentBatch);
  const batchItem: IPregenShipmentBatchItem = {
    PK: batchId,
    ...batch,
    brand,
    channel,
  };
  await put(TABLE_NAME, batchItem);
};

export const eventhandler = middleware(
  SHIPPO_KEY,
  async (client: any, event: PregenBatchCreationEvent) =>
    createBatch(client, event)
);
