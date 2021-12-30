import axios from "axios";
import admzip from "adm-zip";
import S3 from "aws-sdk/clients/s3";
import { ShipmentBatchMapInput } from "../types";
const s3 = new S3();
const { BUCKET_NAME } = process.env;

export const getLabelImages = async (event: ShipmentBatchMapInput) => {
  console.log(JSON.stringify(event));
  const { batch, index } = event;
  const labelUrl = batch.label_url[index];
  const result = await axios.get(labelUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  const { data } = result;
  console.log(JSON.stringify(data));
  const zip = new admzip(data);
  const zipEntries = zip.getEntries();

  await Promise.all(
    zipEntries.map(async (zipEntry) => {
      const data = zipEntry.getData();
      await s3
        .putObject({
          Bucket: BUCKET_NAME,
          Key: `pregen/${batch.metadata}/${zipEntry.entryName}`,
          Body: data,
          ContentType: "image/png",
        })
        .promise();
    })
  );
};
export const handler = getLabelImages;
