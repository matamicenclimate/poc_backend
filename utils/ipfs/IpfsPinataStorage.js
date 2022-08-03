const pinataSDK = require('@pinata/sdk')
const { Readable } = require('stream')

class IpfsPinataStorage {
  constructor() {
    try {
      const apiKey = process.env.PINATA_API_KEY
      const apiSecret = process.env.PINATA_API_SECRET
      this.storage = pinataSDK(apiKey, apiSecret)
    } catch (error) {
      const message = `Instanciate 'IpfsPinataStorage' class error: ${error.message}`
      throw new Error(message)
    }
  }

  prepare(file, mime, name) {
    try {
      this.readableStreamForFile = Readable.from(file)
      this.readableStreamForFile.path = name
      this.options = {
        pinataMetadata: {
          name,
        },
        pinataOptions: { cidVersion: 0 },
      }
    } catch (error) {
      const message = `Instanciate IpfsPinataStorage 'File' class error: ${error}`
      throw new Error(message)
    }
  }

  async store() {
    try {
      const result = await this.storage.pinFileToIPFS(this.readableStreamForFile, this.options)
      return result.IpfsHash
    } catch (error) {
      const message = `Calling store of 'IpfsPinataStorage' error: ${error}`
      throw new Error(message)
    }
  }
}

module.exports = IpfsPinataStorage
