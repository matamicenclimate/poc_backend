const puppeteer = require('puppeteer')
const path = require('path')

async function createPDF(html, filePath) {
  // launch a new chrome instance
  const browser = await puppeteer.launch({
    headless: true,
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

const generateCompensationPDF = (ipfsUrls) => {
  return `
    <html>
      <body style="text-align: right;">
        <h2 style="color:red;">Hola ${ipfsUrls.join(', ')}</h2>
      </body>
    </html>
  `
}
module.exports = {
  createPDF,
  generateCompensationPDF
}