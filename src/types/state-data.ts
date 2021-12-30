import type {
  IWholesaleBoxItem,
  PDFOrderType,
} from "@TestSls/fulfillment-utils";
import type {
  IAddress,
  IShipmentBatch,
  IShipmentBatchShipmentData,
  ITransaction,
} from "@TestSls/shippo-utils";
import type { BrandName } from "@TestSls/util/lib/types/brand";

export interface IPregenTransactionBatchMapData
  extends IPregenTransactionBatchMapInput {
  /** Array of 10 PK order shipment rows */
  shipment_keys?: string[];
}

export interface IPregenOrderShipment {
  /** Parent shipment batch ID */
  batchId: string;
  eventTime: string;
  /** Individual order data */
  order: {
    address_from: IAddress;
    address_to: IAddress;
    boxItem: IWholesaleBoxItem;
    brand: BrandName;
    channel: string;
    email: string;
    productionOrderId: string;
    salesOrderId: string;
  };
  meta: {
    shippingLeg: string;
    shippingType: string;
  };
  shipment?: IShipmentBatchShipmentData;
  transaction?: ITransaction;
}

export interface IPregenShipmentGroupResultParams {
  keys: string[];
}
export interface IPregenShipmentBatchResultParams {
  batchId: string;
}

export type ShipmentBatchMapInput = {
  /** Batch data */
  batch: IShipmentBatch;
  /** Batch internal ID (PK) */
  batchId: string;
  /** Page index for iterating over shipment results, label URLs */
  index: number;
};

export interface IPregenShipmentBatchItem {
  /** Batch shipment data */
  batch_shipment: IShipmentBatch;
  brand: string;
  channel: string;
  /** PK like: brand_channel_eventTime */
  PK: string;
  /** Array of order_brand_channel_eventTime to identify shipments */
  shipment_keys: string[];
}

export interface IPregenTransactionBatchInput {
  /** PK of batch ID row */
  batchId: string;
  shipment_keys?: string[];
}
/** State input data */
export interface IPregenTransactionBatchMapInput {
  /** PK of parent batch row */
  batchId: string;
  /** Index (0-999) of group of 10 shipments */
  groupId?: number;
  /** PK of batch group ID row containing 10 shipment transactions to retrieve */
  PK: string;
}
export type PregenBookletEventData = IPregenOrderShipment & {
  type: PDFOrderType;
  label: {
    key: string;
  };
};
