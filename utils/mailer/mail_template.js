var Module = require('module')
var fs = require('fs')

Module._extensions['.png'] = function (module, fn) {
  var base64 = fs.readFileSync(fn).toString('base64')
  module._compile('module.exports="data:Logo/jpg;base64,' + base64 + '"', fn)
}
var Logo = require('../../admin/src/assets/images/logo-light.png')

const getButton = (button, color) => {
  return `<table
    border="0"
    cellpadding="0"
    cellspacing="0"
    width="100%"
    class="mcnButtonBlock"
    style="min-width: 100%; border-collapse: collapse;"
    >
        <tbody class="mcnButtonBlockOuter">
            <tr>
                <td
                    valign="top"
                    align="center"
                    class="mcnButtonBlockInner"
                    >
                    <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        class="mcnButtonContentContainer"
                        style="
                        background-color: #f4f5f6;
                        "
                        >
                        <tbody>
                        <tr>
                            <td
                                align="center"
                                valign="middle"
                                class="mcnButtonContent"
                                >
                                <a
                                    class="mcnButton"
                                    title="View transaction"
                                    href=${button.href}
                                    target="_blank"   
                                    style="color: ${color};"
                                    >${button.label}
                                </a>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>`
}

function getHTMLTemplate(mailContent) {
  return `
    <html
       xmlns="http://www.w3.org/1999/xhtml"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       >
       <head>
          <meta charset="UTF-8"/>
          <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <title></title>
          <style type="text/css">
             /* CSS styles */
             p {
             margin: 10px 0;
             padding: 0;
             }
             table {
             border-collapse: collapse;
             }
             body,
             #bodyTable,
             #bodyCell {
             height: 100%;
             margin: 0;
             padding: 0;
             width: 100%;
             font-family: 'neue-montreal', 'Neue Montreal';
             }
             .mcnPreviewText {
             display: none !important;
             }
             #outlook a {
             padding: 0;
             }
             table {
             mso-table-lspace: 0pt;
             mso-table-rspace: 0pt;
             }
             .ReadMsgBody {
             width: 100%;
             }
             .ExternalClass {
             width: 100%;
             }
             p,
             a,
             li,
             td,
             blockquote {
             mso-line-height-rule: exactly;
             }
             a[href^=tel],
             a[href^=sms] {
             color: inherit;
             cursor: default;
             text-decoration: none;
             }
             p,
             a,
             li,
             td,
             body,
             table,
             blockquote {
             -ms-text-size-adjust: 100%;
             -webkit-text-size-adjust: 100%;
             }
             .ExternalClass,
             .ExternalClass p,
             .ExternalClass td,
             .ExternalClass div,
             .ExternalClass span,
             .ExternalClass font {
             line-height: 100%;
             }
             a[x-apple-data-detectors] {
             color: inherit !important;
             text-decoration: none !important;
             font-size: inherit !important;
             font-family: inherit !important;
             font-weight: inherit !important;
             line-height: inherit !important;
             }
             #bodyCell {
             padding: 10px;
             }
             /*
             Background Style
             */
             body,
             #bodyTable {
             background-color: #f4f5f6;
             }
             #bodyCell {
             border-top: 0;
             }
             /*
             Email Border
             */
             .templateContainer {
             border: 0;
             }
             #templatePreheader {
             background-color: #FAFAFA;
             background-image: none;
             background-repeat: no-repeat;
             background-position: center;
             background-size: cover;
             border-top: 0;
             border-bottom: 0;
             padding-top: 9px;
             padding-bottom: 9px;
             }
             /*
             Header Style
             */
             #templateHeader {
             background-color: #FFFFFF;
             background-image: none;
             background-repeat: no-repeat;
             background-position: center;
             background-size: cover;
             border-top: 0;
             border-bottom: 0;
             padding-top: 0px;
             padding-bottom: 0;
             }
             /*
             Body Style
             */
             #templateBody {
             background-color: #ffffff;
             background-image: none;
             background-repeat: no-repeat;
             background-position: center;
             background-size: cover;
             border-top: 0;
             border-bottom: 2px solid #EAEAEA;
             padding-top: 0;
             padding-bottom: 77px;
             }
             /*
             Footer Text
             */
             #templateFooter .mcnTextContent,
             #templateFooter .mcnTextContent p {
             color: #656565;
             font-size: 12px;
             line-height: 150%;
             text-align: center;
             }
             /* Classes */
             .templateContainer {
             max-width: 900px !important;
             }
             a.mcnButton {
             display: block;
             }
             .mcnTextContent {
             word-break: break-word;
             }
             .mcnTextContent img {
             height: auto !important;
             }
             .mcnTextContent span {
             height: auto !important;
             }
             .mcnDividerBlock {
             table-layout: fixed !important;
             }
             .mcnButtonContentContainer {
             border-collapse: separate !important;
             border-radius: 50px;
             background-color: #364237;
             width: 330px;
             font-size: 25px;
             padding: 18px;
             }
             .mcnButton {
             line-height: 100%;
             text-align: center;
             text-decoration: none;
             }
             .mcnButtonBlockInner{
             padding-top: 0;
             padding-right: 18px;
             padding-bottom: 32px;
             padding-left: 18px;
             }
             .mcnTextParagraph {
             font-size: 20px;
             padding: 72px;
             }
             .mcnTextTitle {
             padding: 72px;
             color: #00db7d;
             font-size: 78px;
             font-weight: normal;
             line-height: 100%;
             text-align: left;
             }
             .mcnTextClaim {
             padding: 0px 150px 137px 72px;
             padding-right: 150px;
             color: #fcfcfd;
             text-align: left;
             font-size: 26px
             }
             .mcnLogo{
                width:220px;
             }
             .mcnFooterText{
             text-align: right; 
             color:#b1b5c3; 
             font-size:16px;
             }
             .mcnFooterText a{
             color:#b1b5c3;
             }
             
             @media only screen and (max-width:1022px) {
             .templateContainer {
             width: 700px !important;
             }
             .mcnButtonContentContainer {
             width: 280px;
             font-size: 22px;
             padding: 15px;
             }
             .mcnTextParagraph {
             font-size: 18px;
             padding: 60px;
             }           
             .mcnTextTitle {
             padding: 60px;
             font-size: 72px;
             }
             .mcnTextClaim {
             padding: 0px 150px 100px 60px;                     
             font-size: 22px;
             }
             .mcnLogo{
                width:200px;
             }
             }
             @media only screen and (max-width:768px) {
             .templateContainer {
             width: 450px !important;
             }
             .mcnButtonContentContainer {
             width: 280px;
             font-size: 22px;
             padding: 15px;
             }
             .mcnTextParagraph {
             font-size: 18px;
             padding: 50px;
             }           
             .mcnTextTitle {
             padding: 50px;
             font-size: 60px;
             }
             .mcnTextClaim {
             padding: 0px 100px 90px 50px;                     
             font-size: 20px;
             }               
             .mcnButtonBlockInner{
             padding-bottom: 10px;
             }
             .mcnLogo{
                width:150px;
             }
             .mcnFooterText{
             font-size:14px;
             }
          
             }
             @media only screen and (max-width: 480px) {
             /* Classes */
             .templateContainer {
             width: 300px !important;
             }
             .mcnTextContentContainer {
             max-width: 100% !important;
             width: 100% !important;
             }
             .mcnButtonBlockInner{
             padding-left: 0px;
             }
             .mcnTextContent {
             padding-right: 18px !important;
             padding-left: 18px !important;
             }
             .mcnButtonContentContainer {
             width: 200px;
             font-size: 18px;
             padding: 15px;
             }
             .mcnTextParagraph {
             font-size: 16px;
             padding: 40px;
             }
             .mcnTextTitle {
             padding: 40px;
             font-size: 42px;
             }
             .mcnTextClaim {
             padding: 0px 80px 60px 50px;                               
             font-size: 18px;
             }
             .mcnLogo{
                width:100px;
             }
             .mcnFooterText{
             font-size:10px;
             }
             #templateBody {
             padding-bottom: 40px;
             }
             /* Boxed text */
             .mcnBoxedTextContentContainer .mcnTextContent,
             .mcnBoxedTextContentContainer .mcnTextContent p {
             font-size: 14px !important;
             line-height: 150% !important;
             }
             /* PreHeader */
             #templatePreheader {
             display: block !important;
             }
             #templatePreheader .mcnTextContent,
             #templatePreheader .mcnTextContent p {
             font-size: 14px !important;
             line-height: 150% !important;
             }
             /* Header */
             #templateHeader .mcnTextContent,
             #templateHeader .mcnTextContent p {
             font-size: 16px !important;
             line-height: 150% !important;
             }
             }
          </style>
       </head>
       <body>
          <span
             class="mcnPreviewText"
             style="
             display: none;
             font-size: 0px;
             line-height: 0px;
             max-height: 0px;
             max-width: 0px;
             opacity: 0;
             overflow: hidden;
             visibility: hidden;
             mso-hide: all;
             "
             ></span>
          <center>
             <table
                align="center"
                border="0"
                cellpadding="0"
                cellspacing="0"
                height="100%"
                width="100%"
                id="bodyTable"
                style="border-collapse: collapse"
                >
             <tr>
                <td align="center" valign="top" id="bodyCell">
                   <table align="center" border="0" cellspacing="0" cellpadding="0" >
             <tr>
                <td align="center" valign="top" >
                   <table
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      width="100%"
                      class="templateContainer"
                      >
                      <tr>
                         <td valign="top" id="templatePreheader" style="background-color: transparent">
                            <table
                               border="0"
                               cellpadding="0"
                               cellspacing="0"
                               width="100%"
                               class="mcnTextBlock"
                               style="min-width: 100%;  border-collapse: collapse"
                               >
                               <tbody class="mcnTextBlockOuter">
                                  <tr>
                                     <td valign="top" class="mcnTextBlockInner" style="padding-top: 9px">
                                        <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                           <tr>
                                              <td valign="top" >
                                                 <table
                                                    align="left"
                                                    border="0"
                                                    cellpadding="0"
                                                    cellspacing="0"
                                                    style="max-width: 100%; min-width: 100%; border-collapse: collapse;"
                                                    width="100%"
                                                    class="mcnTextContentContainer"
                                                    >
                                                    <tbody>
                                                       <tr>
                                                          <td
                                                             valign="top"
                                                             class="mcnTextContent"
                                                             style="
                                                             padding: 0px 18px 9px;
                                                             color: #353945;
                                                             text-align: center;
                                                             font-size: 18px;
                                                             ">
                                                             If you can't read this email
                                                             <a
                                                                href="https://climatetrade.com/es/inicio/?gclid=Cj0KCQjwlemWBhDUARIsAFp1rLV2SgJulDrvx7HqpdYvE3jOWqpbPmw3uC5w_I6hiscEHInEOe1s00IaAtlkEALw_wcB"
                                                                style="color: #353945"
                                                                target="_blank">
                                                                click here
                                                            </a>
                                                          </td>
                                                       </tr>
                                                    </tbody>
                                                 </table>
                                              </td>
                                           </tr>
                                        </table>
                                     </td>
                                  </tr>
                               </tbody>
                            </table>
                         </td>
                      </tr>
                      <tr>
                         <td valign="top" id="templateHeader">
                            <table
                               border="0"
                               cellpadding="0"
                               cellspacing="0"
                               width="100%"
                               class="mcnBoxedTextBlock"
                               style="min-width: 100%; border-collapse: collapse;"
                               >
                               <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%">
                                  <tbody class="mcnBoxedTextBlockOuter">
                                     <tr>
                                        <td valign="top" class="mcnBoxedTextBlockInner">
                                        <td align="center" valign="top">
                                           <table
                                              align="left"
                                              border="0"
                                              cellpadding="0"
                                              cellspacing="0"
                                              width="100%"
                                              style="min-width: 100%; border-collapse: collapse;"
                                              class="mcnBoxedTextContentContainer"
                                              >
                                              <tbody>
                                                 <tr>
                                                    <td>
                                                       <table
                                                          border="0"
                                                          cellspacing="0"
                                                          class="mcnTextContentContainer"
                                                          width="100%"
                                                          style="min-width: 100% !important; background-color: #404040; border-collapse: collapse;"
                                                          >
                                                          <tbody>
                                                             <tr>
                                                                <td
                                                                   valign="top"
                                                                   class="mcnTextTitle"
                                                                   >
                                                                   <span>${mailContent.title}</span>
                                                                </td>
                                                             </tr>
                                                          </tbody>
                                                       </table>
                                                    </td>
                                                 </tr>
                                              </tbody>
                                              <tbody>
                                                 <tr>
                                                    <td>
                                                       <table
                                                          border="0"
                                                          cellspacing="0"
                                                          class="mcnTextContentContainer"
                                                          width="100%"
                                                          style="min-width: 100% !important; background-color: #404040; border-collapse: collapse;"
                                                          >
                                                          <tbody>
                                                             <tr>
                                                                <td
                                                                   valign="top"
                                                                   class="mcnTextClaim"
                                                                   >
                                                                   <span>
                                                                   ${mailContent.claim}
                                                                   </span>
                                                                </td>
                                                             </tr>
                                                          </tbody>
                                                       </table>
                                                    </td>
                                                 </tr>
                                              </tbody>
                                           </table>
                                        </td>
                                     </tr>
                               </table>
                               </td>
                               </tr>
                               </tbody>
                            </table>
                         </td>
                      </tr>
                      <tr>
                         <td valign="top" id="templateBody">
                            <table
                               border="0"
                               cellpadding="0"
                               cellspacing="0"
                               width="100%"
                               class="mcnTextBlock"
                               style="min-width: 100%; border-collapse: collapse;"
                               >
                               <tbody class="mcnTextBlockOuter">
                                  <tr>
                                     <td valign="top" class="mcnTextBlockInner" >
                                        <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                           <tr>
                                              <td valign="top" width="600" style="width:600px;">
                                                 <table
                                                    align="left"
                                                    border="0"
                                                    cellpadding="0"
                                                    cellspacing="0"
                                                    style="max-width: 100%; min-width: 100%; border-collapse: collapse;"
                                                    width="100%"
                                                    class="mcnTextContentContainer"
                                                    >
                                                    <tbody>
                                                       <tr>
                                                          <td
                                                             class="mcnTextParagraph"
                                                             valign="top"
                                                             class="mcnTextContent"
                                                             style="color: #777e90;"
                                                             >
                                                             ${mailContent.text}
                                                        </td>
                                                       </tr>
                                                    </tbody>
                                                 </table>
                                              </td>
                                           </tr>
                                        </table>
                                     </td>
                                  </tr>
                               </tbody>
                            </table>
                            ${mailContent.button_1 && getButton(mailContent.button_1, '#777E90')}
                            ${mailContent.button_2 && getButton(mailContent.button_2, '#FCFCFD')}
                            </td>
                      </tr>
                      <tr>
                         <td valign="top" id="templateFooter">
                            <table
                               border="0"
                               cellpadding="0"
                               cellspacing="0"
                               width="100%"
                               class="mcnTextBlock"
                               style="min-width: 100%; border-collapse: collapse;"
                               >
                               <tbody class="mcnTextBlockOuter">
                                  <tr>
                                     <td valign="top" class="mcnTextBlockInner" style="padding-top: 36px">
                                        <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                           <tr>
                                              <td valign="top">
                                                 <table
                                                    align="left"
                                                    border="0"
                                                    cellpadding="0"
                                                    cellspacing="0"
                                                    style="border-collapse: collapse;"
                                                    width="100%"
                                                    class="mcnTextContentContainer"
                                                    >
                                                    <tbody>
                                                       <tr>
                                                          <td
                                                             valign="top"
                                                             class="mcnTextContent"
                                                             style="text-align: left"
                                                             >
                                                              <img class="mcnLogo" src="${Logo}" alt="Climatecoin Logo"/>
                                                          </td>
                                                       </tr>
                                                    </tbody>
                                                 </table>
                                              </td>
                                              <td valign="top" >
                                                 <table
                                                    align="left"
                                                    border="0"
                                                    cellpadding="0"
                                                    cellspacing="0"
                                                    style="border-collapse: collapse;"
                                                    width="100%"
                                                    class="mcnTextContentContainer"
                                                    >
                                                    <tbody>
                                                       <tr>
                                                          <td
                                                             valign="top"
                                                             class="mcnTextContent"
                                                             >
                                                             <div class="mcnFooterText" >
                                                                ClimateCoin © 2022. All rights reserved.</br>
                                                                <a
                                                                href="https://climatetrade.com/es/inicio/?gclid=Cj0KCQjwlemWBhDUARIsAFp1rLV2SgJulDrvx7HqpdYvE3jOWqpbPmw3uC5w_I6hiscEHInEOe1s00IaAtlkEALw_wcB"
                                                                target="_blank">
                                                                I don't want to receive these emails anymore
                                                                </a>
                                                             </div>
                                                          </td>
                                                       </tr>
                                                    </tbody>
                                                 </table>
                                              </td>
                                           </tr>
                                           </tbody>
                                        </table>
                                     </td>
                                  </tr>
                            </table>
                         </td>
                      </tr>
                   </table>
          </center>
       </body>
    </html>      
    `
}

module.exports = { getHTMLTemplate }
