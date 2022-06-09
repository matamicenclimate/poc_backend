const puppeteer = require('puppeteer')
const path = require('path')

async function createPDF(html, filePath) {
  // launch a new chrome instance
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox']
  })

  // create a new page
  const page = await browser.newPage()
  // set your html as the pages content

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
  })

  // create a pdf buffer
  const pdfBuffer = await page.pdf({
    format: 'A4',
  })

  // or a .pdf file
  await page.pdf({
    format: 'A4',
    path: path.join('public/uploads', filePath),
  })

  // close the browser
  await browser.close()
}

/***
 *
 * @param txnId {string}
 * @param ipfsCids
 * @param nfts
 * @param burnReceipt
 * @returns {string}
 */
const generateCompensationPDF = (txnId, ipfsCids, nfts, burnReceipt) => {
  function renderTable() {
    return nfts.map(
      (nft) => `
<tr>
    <th>${nft.metadata.properties.title}</th>
    <th>${nft.metadata.description}</th>
    <th>${burnReceipt[nft.asa_id]}</th>
    <th>${nft.metadata.properties.serial_number}</th>
    <th>${nft.asa_id}</th>
</tr>
    `,
    )
  }

  function renderCertificates(cids) {
    return cids.map(
      (cid) => `
<li style="color: #364237; text-transform: capitalize; padding: 0px 10px;">
    <a href="https://cloudflare-ipfs.com/ipfs/${cid}">View certificate</a>
</li>
    `,
    )
  }

  return `
<html>
  <body style=" max-width: 2480px; padding: 20px;">
    <div style="margin-bottom: 15px; display: flex; flex-direction:column;">
        <h2>Consolidation Certificate</h2>
        <h4>Content ID: ${ipfsCids.join(', ')}</h4>
        <h4>Transaction ID: <a href="https://testnet.algoexplorer.io/tx/group/${txnId}">${txnId}</a></h4>
    </div>
    <div style=" max-width: 90%;">
      <table >
        <thead>
          <tr style="color: #364237; text-transform: capitalize; padding: 0px 10px;">
            <th>title</th>
            <th>description</th>
            <th>amount</th>
            <th>serial number</th>
            <th>asset id</th>
          </tr>
          </thead>
          <tbody>
            ${renderTable().join('')}
          </tbody>
      </table>
      <h2>Registry certificates</h2>
      <ul>
        ${renderCertificates(ipfsCids).join('')}
      </ul>
    </div>
  </body>
</html>
`
}
module.exports = {
  createPDF,
  generateCompensationPDF,
}
