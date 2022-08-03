const { NFTStorage, Blob } = require('nft.storage')
class IpfsNftStorage {
  constructor() {
    try {
      this.ipfsData = null
      this.token = process.env.NFT_STORAGE_TOKEN
      this.storage = new NFTStorage({ token: this.token })
    } catch (error) {
      const message = `Instanciate 'NFTStorage' class error: ${error.message}`
      console.error(message)
      throw error
    }
  }

  prepare(file, mime) {
    try {
      this.ipfsData = new Blob([file.buffer], { mime })
    } catch (error) {
      const message = `Instanciate NFTStorage 'File' class error: ${error.message}`
      console.error(message, { stack: error.stack })
      throw error
    }
  }

  async store() {
    try {
      return await this.storage.storeBlob(this.ipfsData)
    } catch (error) {
      const message = `Calling store of 'NFTStorage' error: ${error.message}`
      console.error(message, {
        stack: error.stack,
        ipfsData: this.ipfsData,
      })
      throw error
    }
  }
}

module.exports = IpfsNftStorage
