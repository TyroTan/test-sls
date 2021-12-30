import "source-map-support/register";
import { getBatchId } from "./lib/batch";
import {
  batchPut,
  getBrandAddress,
  getProductDataByInternalId,
} from "@TestSls/fulfillment-utils";
import { middleware } from "@TestSls/db-connector";
import { arrayUtils } from "@TestSls/util";
// Types
import type { IWholesaleBoxItem } from "@TestSls/fulfillment-utils";
import type { Connection, RowDataPacket } from "@TestSls/db-connector";
import type {
  IPregenOrderEventDetail,
  IPregenOrderShipment,
  PregenBatchCreationEvent,
} from "./types";
import type { IAddress } from "@TestSls/shippo-utils";
const { DB_CREDENTIAL_KEY, TABLE_NAME } = process.env;

type IWholesaleBoxItemData = RowDataPacket &
  IWholesaleBoxItem & { salesOrderId: number };
export const getBoxIds = async (
  connection: Connection,
  salesOrderIds: number[]
): Promise<IWholesaleBoxItemData[]> => {
  const [result] = await connection.query<IWholesaleBoxItemData[]>(
    /*sql*/ `
  SELECT
    o.order_id as salesOrderId,
    pv.product_id as productId,
    pv.id as variantId FROM orders o
  JOIN orders_items oi ON o.order_id = oi.order_id
  JOIN ProductVariants pv ON oi.prod_id = pv.sku
  JOIN Products p ON p.id = pv.product_id AND p.product_type_id = 3
  WHERE o.order_id IN (?)`,
    [salesOrderIds]
  );
  if (result.length === 0) {
    throw new Error(`Unable to find sales order items`);
  }
  return result;
};

/** Reduce box item array to one of each unique product variant  */
const reduceBoxItems = (items: IWholesaleBoxItem[]) =>
  items.reduce(
    (group, curr) =>
      group.findIndex(
        ({ productId, variantId }) =>
          curr.productId === productId && curr.variantId === variantId
      ) !== -1
        ? group
        : [...group, curr],
    []
  );

const createOrderData = (
  eventData: IPregenOrderEventDetail,
  salesOrderId: number,
  boxItem: IWholesaleBoxItem,
  brandAddress: IAddress
) => ({
  PK: `${salesOrderId}_${getBatchId(
    eventData.brand,
    eventData.channel,
    eventData.eventTime
  )}`,
  batchId: getBatchId(eventData.brand, eventData.channel, eventData.eventTime),
  eventTime: eventData.eventTime,
  order: {
    salesOrderId: `${salesOrderId}`,
    productionOrderId: `${salesOrderId}`,
    brand: eventData.brand,
    channel: eventData.channel,
    email: eventData.brandEmail,

    boxItem,
    address_from: {
      ...brandAddress,
      name: `${eventData.channel} Order`,
    },
    address_to: brandAddress,
  },
  meta: {
    shippingLeg: "initialInbound",
    shippingType: "standard",
  },
});

export const getOrderData = async (
  event: PregenBatchCreationEvent,
  connection: Connection
): Promise<any> => {
  // Get box product from orders_items
  const {
    detail: { salesOrderIds, brand },
  } = event;

  /** Get box products for orders */
  const orderBoxItems = await getBoxIds(connection, salesOrderIds);
  console.log(JSON.stringify(orderBoxItems));
  /** Reduce boxes down to a unique array by product, variant IDs */
  const boxes = reduceBoxItems(orderBoxItems);
  console.log(JSON.stringify(boxes));
  /** Make one request for product data for each unique box type */
  const boxItems = await Promise.all(
    boxes.map((box) => getProductDataByInternalId(box))
  );
  console.log(JSON.stringify(boxItems));
  const brandAddress = await getBrandAddress(TABLE_NAME, brand);
  // Format brand address

  /** Match orders to box data and create full order data */
  const orderData: IPregenOrderShipment[] = orderBoxItems.map((orderBox) => {
    const boxItem = boxItems.find(
      ({ productId, variantId }) =>
        orderBox.productId === productId && orderBox.variantId === variantId
    );
    return createOrderData(
      event.detail,
      orderBox.salesOrderId,
      boxItem,
      brandAddress
    );
  });
  console.log(JSON.stringify(orderData));
  const batchedPuts = arrayUtils.arrayChunks(orderData, 25);
  await Promise.all(batchedPuts.map((puts) => batchPut(TABLE_NAME, puts)));
};
export const eventhandler = middleware(
  DB_CREDENTIAL_KEY,
  "us-west-2",
  "TestSls_siteadmin",
  getOrderData
);
