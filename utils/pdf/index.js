var fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

function readPngBuffer(file) {
  return fs.readFileSync(path.join(__dirname, file))
}

function readPng(file) {
  return `data:image/png;base64,${readPngBuffer(file).toString('base64')}`
}

var Logo = readPng('./assets/logo-light.png')
var LogoBuffer = readPngBuffer('./assets/logo-light.png')
var LogoStrapiBuffer = readPngBuffer('../../admin/src/assets/images/logo-strapi.png')

var Sign = readPng('./assets/sign.png')

async function createPDF(html, filePath) {
  // launch a new chrome instance
  const puppeteerParams = { args: ['--no-sandbox'] }
  // TODO: Detectar aqui si estamos en producción...
  if (process.env.BASE_URL.includes('staging')) {
    puppeteerParams.executablePath = '/usr/bin/chromium-browser'
  }

  const browser = await puppeteer.launch(puppeteerParams)

  // create a new page
  const page = await browser.newPage()
  // set your html as the pages content

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
  })

  // create a pdf buffer
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
  })

  // or a .pdf file
  // await page.pdf({
  //   format: 'A4',
  //   path: path.join('public/uploads', filePath),
  // })

  // close the browser
  await browser.close()

  return pdfBuffer
}

/***
 *
 * @param ipfsCids
 * @param compensation
 * @returns {string}
 */

const generateCompensationPDF = (ipfsCids, compensation) => {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  var today = new Date()
  var dd = String(today.getDate()).padStart(2, '0')
  var mm = String(monthNames[today.getMonth()])
  var yyyy = today.getFullYear()
  today = dd + ' ' + mm + ' ' + yyyy

  const title = (nft) => {
    if (nft.metadata.properties.title.length > 12) {
      return nft.metadata.properties.title.slice(0, 12) + '...'
    }
    return nft.metadata.properties.title
  }

  const totalClimatecoins = (amount) => {
    if (amount === 1) {
      return amount + ' climatecoin'
    }
    return amount + ' climatecoins'
  }

  function renderBurnedNft() {
    return compensation.nfts.map(
      (nft) => `
        <div style="width: 100%; padding: 60px; display: flex; flex-direction:column; background-color: #364237; page-break-before: always;" >
          <div style="width: 100%; height: min-content; margin-bottom:15px; display: flex; flex-direction: row; justify-content: space-between; align-items:center">
            <div>
              <img src="${Logo}" alt="Climatecoin logo" style="width: 150px;"/>
            </div>
            <div style="font-size: 14px; text-align:left; display:flex; flex-direction: column;">
              <p style="color: #fcfcfd; margin:0px 0px 5px 0px">${today}</p>
              <p style="color: #b1b5c3; margin:0px 0px 5px 0px">#${nft.id}</p>
            </div>
          </div>
          <hr style="width: 100%; margin-top:30px"/>
          <h1 style="max-width: 50%; height: min-content; font-size: 52px; color: #00db7d;">
            ${title(nft)} compensation certificate
          </h1>
          <p style="max-width: 80%; height: min-content; font-size: 17px; color: #fcfcfd;">
            You have compensate <strong>${
              compensation.burn_receipt[nft.asa_id.toInt()]
            } t</strong> of <strong>CO2</strong>
            for this project from ClimateCoin.
            This certificate is official, created and validated by Climatecoin.
          </p>
        </div>
        <div style="width: 100%; padding: 50px;">
          <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: 1fr; gap: 36px;">
            <dl style="grid-column: 1 / 4; grid-row: 1 ; border: 1px #e6e8ec solid; border-radius: 8px; padding: 16px; margin:0px; font-size:9px;   gap: 10.7px;">
              <dt style="margin-bottom: 5px; line-height: 1.71; text-align: left; color: #777e90;">
                Project
              </dt>
              <dd style="margin-bottom: 5px; margin-left:0px">${nft.metadata.properties.title}</dd>
              <hr />
              <div style=" display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr)">
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    Standard
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">${nft.metadata.standard}</dd>
                </div>
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    Serial Number
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">${nft.metadata.properties.serial_number}</dd>
                </div>
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    Total Climatecoins
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px; color: #00db7d; font-weight: 500;">
                    ${totalClimatecoins(compensation.burn_receipt[nft.asa_id.toInt()])}
                  </dd>
                </div>
              </div>
              <hr />
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: 1fr">
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    ID project
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">${nft.metadata.properties.id}</dd>
                </div>
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    External Url
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">
                    <a href="${`${process.env.IPFS_BASE_URL}${nft.registry_certificate_ipfs_cid}`}" target="_blank" style="text-decoration: none; color: #00db7d;">Open External Url</a>
                  </dd>
                </div>
              </div>
              <hr />
              <div style=" display: grid; grid-template-columns: repeat(2, 1fr) ; grid-template-rows: 1fr ">
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    ID Transaction
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">
                    ${nft.asa_txn_id?.slice(0, 10)}...${nft.asa_txn_id?.slice(-10)}
                  </dd>
                </div>
                <div>
                  <dt style="margin-bottom:5px; line-height: 1.71; text-align: left; color: #777e90;">
                    Network
                  </dt>
                  <dd style="margin-bottom: 5px; margin-left:0px">Algorand</dd>
                </div>
              </div>
            </dl>
          </div>
          <div style="width: 100%; display: grid; grid-template-columns: repeat(5, 1fr); margin-top: 57px;">
            <div>
              <img src="${Sign}" alt="Signed document" style="width: 205px;"/>
            </div>
            <div style="text-align:right; grid-column: 4/6; font-size:10px ;">
              <p style="color:#777e90">If you have any questions or suggestions about this certificate, please write to us at:</p>
              <p style="color:#00db7d">certificates@climatecoin.io</p>
            </div>
          </div>
        </div>
        </div>
       `,
    )
  }

  return `
  <html>
  <body style="font-family: 'neue-montreal', 'Neue Montreal', sans-serif; max-width: 793px; max-height: 1122px; margin:0px; top: 0; left:0; ">
    ${renderBurnedNft()}
  </body>
  </html>
`
}
module.exports = {
  createPDF,
  generateCompensationPDF,
  Logo,
  LogoBuffer,
  LogoStrapiBuffer,
}
