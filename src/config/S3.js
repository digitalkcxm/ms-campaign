import AppVariables from './appVariables.js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import readline from 'readline'

export default class S3 {
  newS3Instance(region = 'sa-east-1') {
    const credentials = { accessKeyId: AppVariables.accessKeyId(), secretAccessKey: AppVariables.secretAccessKey() }

    return new S3Client({
      credentials,
      region
    })
  }

  async downloadFile(key) {
    try {
      if (!key) {
        throw new Error('filename not informed')
      }

      const bucket = AppVariables.bucketCampaing()
      const s3 = this.newS3Instance()
      const params = {
        Bucket: bucket,
        Key: key
      }

      const response = await s3.send(new GetObjectCommand(params))
      const readableStream = response.Body

      const reader = readline.createInterface({ input: readableStream })

      var obj = []

      for await (const line of reader) {
        obj.push(line)
      }

      reader.close()

      return obj
    } catch (err) {
      console.log('🚀 ~ S3 ~ downloadFile ~ err:', err)
    }
  }
}
