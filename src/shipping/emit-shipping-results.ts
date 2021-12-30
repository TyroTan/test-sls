import { emitEvents } from "@TestSls/fulfillment-utils";
import {
  IPregenShipmentGroupResultParams,
  IPregenShipmentBatchResultParams,
} from "../types";
const { PRODUCTION_EVENT_BUS } = process.env;

export const groupComplete = async (
  event: IPregenShipmentGroupResultParams
) => {
  console.log(JSON.stringify({ event }));
  await emitEvents(
    PRODUCTION_EVENT_BUS,
    [{ keys: event.keys }],
    "Pregen guide create request"
  );
};
export const batchComplete = async (
  event: IPregenShipmentBatchResultParams
) => {
  console.log(JSON.stringify({ event }));
  await emitEvents(
    PRODUCTION_EVENT_BUS,
    [{ ...event }],
    "Shipment batch shipment data retrieved"
  );
};
