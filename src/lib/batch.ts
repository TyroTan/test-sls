import { BrandName } from "@TestSls/util/lib/types/brand";

export const getBatchId = (
  brand: BrandName,
  channel: string,
  eventTime: string
) => `${brand}_${channel}_${eventTime}`;
