'use strict'

const mailer = require(`${process.cwd()}/utils/mailer`)
const fileUploader = require(`${process.cwd()}/utils/upload`)
const algorandUtils = require(`${process.cwd()}/utils/algorand`)
const ALGORAND_ENUMS = require(`${process.cwd()}/utils/enums/algorand`)
const formatters = require(`${process.cwd()}/utils/formatters`)
const utils = require(`${process.cwd()}/utils`)
const algosdk = require('algosdk')
const { algoClient, algoIndexer } = require(`${process.cwd()}/config/algorand`)
const { getEscrowFromApp } = require('../../../utils/algorand')

function formatBodyArrays(collectionTypeAtts, requestBody) {
  for (const key of collectionTypeAtts) {
    const incomingAttData = requestBody[key]
    if (incomingAttData) {
      const parsedData = JSON.parse(incomingAttData)
      requestBody[key] = formatters.mongoIdFormatter(parsedData)
    }
  }

  return requestBody
}

async function findOne(ctx) {
  const {id} = ctx.params
  const user = ctx.state.user
  const document = await strapi.services['carbon-documents'].findOne({ id })

  if (!document || document.id !== id) return ctx.badRequest('Not found')
  if (document.created_by_user !== user.email) return ctx.badRequest('Unauthorized')

  return document
}

async function find(ctx) {
  const user = ctx.state.user
  const query = ctx.query
  query.created_by_user = user.email

  return await strapi.services['carbon-documents'].find({ ...ctx.query })
}

async function create(ctx) {
  const collectionName = ctx.originalUrl.substring(1)
  const applicationUid = strapi.api[collectionName].models[collectionName].uid
  const pushFilesResponse = await fileUploader.pushFile(ctx)
  ctx.request.body = { ...ctx.request.body, ...pushFilesResponse }
  const collectionTypeAtts = utils.getAttributesByType(
    strapi.api[collectionName].models[collectionName].attributes,
    'collection',
    'plugin',
  )

  ctx.request.body = formatBodyArrays(collectionTypeAtts, ctx.request.body)
  const createdDocument = await strapi.services[collectionName].create(ctx.request.body)
  if (process.env.NODE_ENV === 'test') {
    return createdDocument
  }

  const url = `${process.env.BASE_URL}${process.env.CONTENT_MANAGER_URL}/${applicationUid}/${createdDocument.id}`
  // const mailContent = `User ${ctx.state.user.email} sent a new document.<br>Available here: ${url}`
  const mailContent = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
   <xml>
      <o:OfficeDocumentSettings>
         <o:AllowPNG/>
         <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
   </xml>
   <meta charset="UTF-8">
   <meta http-equiv="X-UA-Compatible" content="IE=edge">
   <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
      p{
      margin:10px 0;
      padding:0;
      }
      table{
      border-collapse:collapse;
      }
      h1,h2,h3,h4,h5,h6{
      display:block;
      margin:0;
      padding:0;
      }
      img,a img{
      border:0;
      height:auto;
      outline:none;
      text-decoration:none;
      }
      body,#bodyTable,#bodyCell{
      height:100%;
      margin:0;
      padding:0;
      width:100%;
      }
      .mcnPreviewText{
      display:none !important;
      }
      #outlook a{
      padding:0;
      }
      img{
      -ms-interpolation-mode:bicubic;
      }
      table{
      mso-table-lspace:0pt;
      mso-table-rspace:0pt;
      }
      .ReadMsgBody{
      width:100%;
      }
      .ExternalClass{
      width:100%;
      }
      p,a,li,td,blockquote{
      mso-line-height-rule:exactly;
      }
      a[href^=tel],a[href^=sms]{
      color:inherit;
      cursor:default;
      text-decoration:none;
      }
      p,a,li,td,body,table,blockquote{
      -ms-text-size-adjust:100%;
      -webkit-text-size-adjust:100%;
      }
      .ExternalClass,.ExternalClass p,.ExternalClass td,.ExternalClass div,.ExternalClass span,.ExternalClass font{
      line-height:100%;
      }
      a[x-apple-data-detectors]{
      color:inherit !important;
      text-decoration:none !important;
      font-size:inherit !important;
      font-family:inherit !important;
      font-weight:inherit !important;
      line-height:inherit !important;
      }
      #bodyCell{
      padding:10px;
      }
      .templateContainer{
      max-width:900px !important;
      }
      a.mcnButton{
      display:block;
      }
      .mcnImage,.mcnRetinaImage{
      vertical-align:bottom;
      }
      .mcnTextContent{
      word-break:break-word;
      }
      .mcnTextContent img{
      height:auto !important;
      }
      .mcnDividerBlock{
      table-layout:fixed !important;
      }
      /*
      @tab Page
      @section Background Style
      @tip Set the background color and top border for your email. You may want to choose colors that match your company's branding.
      */
      body,#bodyTable{
      /*@editable*/background-color:#f4f5f6;
      }
      /*
      @tab Page
      @section Background Style
      @tip Set the background color and top border for your email. You may want to choose colors that match your company's branding.
      */
      #bodyCell{
      /*@editable*/border-top:0;
      }
      /*
      @tab Page
      @section Email Border
      @tip Set the border for your email.
      */
      .templateContainer{
      /*@editable*/border:0;
      }
      #templatePreheader{
      /*@editable*/background-color:#FAFAFA;
      /*@editable*/background-image:none;
      /*@editable*/background-repeat:no-repeat;
      /*@editable*/background-position:center;
      /*@editable*/background-size:cover;
      /*@editable*/border-top:0;
      /*@editable*/border-bottom:0;
      /*@editable*/padding-top:9px;
      /*@editable*/padding-bottom:9px;
      }
      /*
      @tab Preheader
      @section Preheader Text
      @tip Set the styling for your email's preheader text. Choose a size and color that is easy to read.
      */
      #templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{
      /*@editable*/color:#656565;
      /*@editable*/font-family:Helvetica;
      /*@editable*/font-size:12px;
      /*@editable*/line-height:150%;
      /*@editable*/text-align:left;
      }
      /*
      @tab Preheader
      @section Preheader Link
      @tip Set the styling for your email's preheader links. Choose a color that helps them stand out from your text.
      */
      #templatePreheader .mcnTextContent a,#templatePreheader .mcnTextContent p a{
      /*@editable*/color:#656565;
      /*@editable*/font-weight:normal;
      /*@editable*/text-decoration:underline;
      }
      /*
      @tab Header
      @section Header Style
      @tip Set the background color and borders for your email's header area.
      */
      #templateHeader{
      /*@editable*/background-color:#FFFFFF;
      /*@editable*/background-image:none;
      /*@editable*/background-repeat:no-repeat;
      /*@editable*/background-position:center;
      /*@editable*/background-size:cover;
      /*@editable*/border-top:0;
      /*@editable*/border-bottom:0;
      /*@editable*/padding-top:0px;
      /*@editable*/padding-bottom:0;
      }
      /*
      @tab Header
      @section Header Text
      @tip Set the styling for your email's header text. Choose a size and color that is easy to read.
      */
      #templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{
      /*@editable*/color:#202020;
      /*@editable*/font-family:Helvetica;
      /*@editable*/font-size:16px;
      /*@editable*/line-height:150%;
      /*@editable*/text-align:left;
      }
      /*
      @tab Header
      @section Header Link
      @tip Set the styling for your email's header links. Choose a color that helps them stand out from your text.
      */
      #templateHeader .mcnTextContent a,#templateHeader .mcnTextContent p a{
      /*@editable*/color:#007C89;
      /*@editable*/font-weight:normal;
      /*@editable*/text-decoration:underline;
      }
      /*
      @tab Body
      @section Body Style
      @tip Set the background color and borders for your email's body area.
      */
      #templateBody{
      /*@editable*/background-color:#ffffff;
      /*@editable*/background-image:none;
      /*@editable*/background-repeat:no-repeat;
      /*@editable*/background-position:center;
      /*@editable*/background-size:cover;
      /*@editable*/border-top:0;
      /*@editable*/border-bottom:2px solid #EAEAEA;
      /*@editable*/padding-top:0;
      /*@editable*/padding-bottom:9px;
      }
      /*
      @tab Body
      @section Body Text
      @tip Set the styling for your email's body text. Choose a size and color that is easy to read.
      */
      #templateBody .mcnTextContent,#templateBody .mcnTextContent p{
      /*@editable*/color:#202020;
      /*@editable*/font-family:Helvetica;
      /*@editable*/font-size:16px;
      /*@editable*/line-height:150%;
      /*@editable*/text-align:left;
      }
      /*
      @tab Body
      @section Body Link
      @tip Set the styling for your email's body links. Choose a color that helps them stand out from your text.
      */
      #templateBody .mcnTextContent a,#templateBody .mcnTextContent p a{
      /*@editable*/color:#007C89;
      /*@editable*/font-weight:normal;
      /*@editable*/text-decoration:underline;
      }
      /*
      @tab Footer
      @section Footer Style
      @tip Set the background color and borders for your email's footer area.
      */
      #templateFooter{
      /*@editable*/background-color:#FAFAFA;
      /*@editable*/background-image:none;
      /*@editable*/background-repeat:no-repeat;
      /*@editable*/background-position:center;
      /*@editable*/background-size:cover;
      /*@editable*/border-top:0;
      /*@editable*/border-bottom:0;
      /*@editable*/padding-top:9px;
      /*@editable*/padding-bottom:9px;
      }
      /*
      @tab Footer
      @section Footer Text
      @tip Set the styling for your email's footer text. Choose a size and color that is easy to read.
      */
      #templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{
      /*@editable*/color:#656565;
      /*@editable*/font-family:Helvetica;
      /*@editable*/font-size:12px;
      /*@editable*/line-height:150%;
      /*@editable*/text-align:center;
      }
      /*
      @tab Footer
      @section Footer Link
      @tip Set the styling for your email's footer links. Choose a color that helps them stand out from your text.
      */
      #templateFooter .mcnTextContent a,#templateFooter .mcnTextContent p a{
      /*@editable*/color:#656565;
      /*@editable*/font-weight:normal;
      /*@editable*/text-decoration:underline;
      }
      @media only screen and (max-width:768px){
      .templateContainer{
      width:600px !important;
      }
      }	@media only screen and (max-width: 480px){
      body,table,td,p,a,li,blockquote{
      -webkit-text-size-adjust:none !important;
      }
      }	@media only screen and (max-width: 480px){
      body{
      width:100% !important;
      min-width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnRetinaImage{
      max-width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImage{
      width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnCartContainer,.mcnCaptionTopContent,.mcnRecContentContainer,.mcnCaptionBottomContent,.mcnTextContentContainer,.mcnBoxedTextContentContainer,.mcnImageGroupContentContainer,.mcnCaptionLeftTextContentContainer,.mcnCaptionRightTextContentContainer,.mcnCaptionLeftImageContentContainer,.mcnCaptionRightImageContentContainer,.mcnImageCardLeftTextContentContainer,.mcnImageCardRightTextContentContainer,.mcnImageCardLeftImageContentContainer,.mcnImageCardRightImageContentContainer{
      max-width:100% !important;
      width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnBoxedTextContentContainer{
      min-width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageGroupContent{
      padding:9px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnCaptionLeftContentOuter .mcnTextContent,.mcnCaptionRightContentOuter .mcnTextContent{
      padding-top:9px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageCardTopImageContent,.mcnCaptionBottomContent:last-child .mcnCaptionBottomImageContent,.mcnCaptionBlockInner .mcnCaptionTopContent:last-child .mcnTextContent{
      padding-top:18px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageCardBottomImageContent{
      padding-bottom:9px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageGroupBlockInner{
      padding-top:0 !important;
      padding-bottom:0 !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageGroupBlockOuter{
      padding-top:9px !important;
      padding-bottom:9px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnTextContent,.mcnBoxedTextContentColumn{
      padding-right:18px !important;
      padding-left:18px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcnImageCardLeftImageContent,.mcnImageCardRightImageContent{
      padding-right:18px !important;
      padding-bottom:0 !important;
      padding-left:18px !important;
      }
      }	@media only screen and (max-width: 480px){
      .mcpreview-image-uploader{
      display:none !important;
      width:100% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Heading 1
      @tip Make the first-level headings larger in size for better readability on small screens.
      */
      h1{
      /*@editable*/font-size:22px !important;
      /*@editable*/line-height:125% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Heading 2
      @tip Make the second-level headings larger in size for better readability on small screens.
      */
      h2{
      /*@editable*/font-size:20px !important;
      /*@editable*/line-height:125% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Heading 3
      @tip Make the third-level headings larger in size for better readability on small screens.
      */
      h3{
      /*@editable*/font-size:18px !important;
      /*@editable*/line-height:125% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Heading 4
      @tip Make the fourth-level headings larger in size for better readability on small screens.
      */
      h4{
      /*@editable*/font-size:16px !important;
      /*@editable*/line-height:150% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Boxed Text
      @tip Make the boxed text larger in size for better readability on small screens. We recommend a font size of at least 16px.
      */
      .mcnBoxedTextContentContainer .mcnTextContent,.mcnBoxedTextContentContainer .mcnTextContent p{
      /*@editable*/font-size:14px !important;
      /*@editable*/line-height:150% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Preheader Visibility
      @tip Set the visibility of the email's preheader on small screens. You can hide it to save space.
      */
      #templatePreheader{
      /*@editable*/display:block !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Preheader Text
      @tip Make the preheader text larger in size for better readability on small screens.
      */
      #templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{
      /*@editable*/font-size:14px !important;
      /*@editable*/line-height:150% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Header Text
      @tip Make the header text larger in size for better readability on small screens.
      */
      #templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{
      /*@editable*/font-size:16px !important;
      /*@editable*/line-height:150% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Body Text
      @tip Make the body text larger in size for better readability on small screens. We recommend a font size of at least 16px.
      */
      #templateBody .mcnTextContent,#templateBody .mcnTextContent p{
      /*@editable*/font-size:16px !important;
      /*@editable*/line-height:150% !important;
      }
      }	@media only screen and (max-width: 480px){
      /*
      @tab Mobile Styles
      @section Footer Text
      @tip Make the footer content text larger in size for better readability on small screens.
      */
      #templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{
      /*@editable*/font-size:14px !important;
      /*@editable*/line-height:150% !important;}  
      }
   </style>
</head>
<body>
   <span class="mcnPreviewText" style="display:none; font-size:0px; line-height:0px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; visibility:hidden; mso-hide:all;">*|MC_PREVIEW_TEXT|*</span>
   <center>
      <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable">
      <tr>
         <td align="center" valign="top" id="bodyCell">
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;">
      <tr>
         <td align="center" valign="top" width="600" style="width:600px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="templateContainer">
               <tr>
                  <td valign="top" id="templatePreheader" style="background-color: transparent;">
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
                        <tbody class="mcnTextBlockOuter">
                           <tr>
                              <td valign="top" class="mcnTextBlockInner" style="padding-top:9px;">
                                 <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                       <td valign="top" width="600" style="width:600px;">
                                          <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%; min-width:100%;" width="100%" class="mcnTextContentContainer">
                                             <tbody>
                                                <tr>
                                                   <td valign="top" class="mcnTextContent" style="padding: 60px 18px 9px; color: #353945; text-align: center;   font-size: 18px;">                        
                                                      If you can't read this email <a href="https://climatetrade.com/es/inicio/?gclid=Cj0KCQjwlemWBhDUARIsAFp1rLV2SgJulDrvx7HqpdYvE3jOWqpbPmw3uC5w_I6hiscEHInEOe1s00IaAtlkEALw_wcB" style="color: #353945;" target="_blank">click here</a>
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
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnBoxedTextBlock" style="min-width:100%;">
                        <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%">
                           <tbody class="mcnBoxedTextBlockOuter">
                              <tr>
                                 <td valign="top" class="mcnBoxedTextBlockInner">
                                 <td align="center" valign="top" ">
                                    <table align="left" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width:100%;" class="mcnBoxedTextContentContainer">
                                       <tbody>
                                          <tr>
                                             <td>
                                                <table border="0" cellspacing="0" class="mcnTextContentContainer" width="100%" style="min-width: 100% !important;background-color: #404040;">
                                                   <tbody>
                                                      <tr>
                                                         <td valign="top" class="mcnTextContent" style="padding: 72px;color: #00DB7D;font-family: Helvetica;font-size: 78px;font-weight: normal;line-height: 100%;text-align: left;">
                                                            <span style="font-size:78px">Your project has been confirmed.</span>
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
                                                <table border="0" cellspacing="0" class="mcnTextContentContainer" width="100%" style="min-width: 100% !important;background-color: #404040; max-width:678px">
                                                   <tbody>
                                                      <tr>
                                                         <td valign="top" class="mcnTextContent" style="padding: 0px 150px 137px 72px; padding-right:150px; color: #fcfcfd; text-align: left; font-size:26px ">
                                                            <span>Your project {name} to offset 5,657 t of CO2 has been confirmed in Climatecoin.</span>
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
                  <td valign="top" id="templateBody" style="padding-bottom:100px">
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
                        <tbody class="mcnTextBlockOuter">
                           <tr>
                              <td valign="top" class="mcnTextBlockInner" style="padding: 64px 72px;">
                                 <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                       <td valign="top" width="600" style="width:600px;">
                                          <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:100%; min-width:100%;" width="100%" class="mcnTextContentContainer">
                                             <tbody>
                                                <tr>
                                                   <td valign="top" class="mcnTextContent" style="color: #777E90;font-size: 20px;">                                                    Congratulations. Your project {name} has been approved for listing on Climatecoin now you can share it with your friends so they can start offsetting their carbon footprint.
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
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonBlock" style="min-width:100%;">
                        <tbody class="mcnButtonBlockOuter">
                           <tr>
                              <td style="padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top" align="center" class="mcnButtonBlockInner">
                                 <table border="0" cellpadding="0" cellspacing="0" class="mcnButtonContentContainer" style="border-collapse: separate !important;border-radius: 50px;background-color: #F4F5F6;">
                                    <tbody>
                                       <tr>
                                          <td align="center" valign="middle" class="mcnButtonContent" style="font-family: Arial; font-size: 16px; padding: 18px;">
                                             <a class="mcnButton " title="View project" href="${url}" target="_blank" style="font-weight: normal;letter-spacing: normal;line-height: 100%;text-align: center;text-decoration: none;color: #777E90; font-size:25px">View project</a>
                                          </td>
                                       </tr>
                                    </tbody>
                                 </table>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnButtonBlock" style="min-width:100%;">
                        <tbody class="mcnButtonBlockOuter">
                           <tr>
                              <td style="padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top" align="center" class="mcnButtonBlockInner">
                                 <table border="0" cellpadding="0" cellspacing="0" class="mcnButtonContentContainer" style="border-collapse: separate !important;border-radius: 50px;background-color: #364237;">
                                    <tbody>
                                       <tr>
                                          <td align="center" valign="middle" class="mcnButtonContent" style="font-family: Arial; font-size: 16px; padding: 18px;">
                                             <a class="mcnButton " title="Share project" href="${url}" target="_blank" style="font-weight: bold;letter-spacing: normal;line-height: 100%;text-align: center;text-decoration: none;color: #FCFCFD; font-size:25px">Share project</a>
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
               <tr>
                  <td valign="top" id="templateFooter">
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" class="mcnTextBlock" style="min-width:100%;">
                        <tbody class="mcnTextBlockOuter">
                           <tr>
                              <td valign="top" class="mcnTextBlockInner" style="padding-top:9px; width:100%">
                                 <table align="left" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                       <td valign="top" width="300" style="width:300px;">
                                          <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:300px;" width="100%" class="mcnTextContentContainer">
                                             <tbody>
                                                <tr>
                                                   <td valign="top" class="mcnTextContent" style="padding: 0px 18px 9px; text-align: left;">
                                                      <em>LOGO</em>
                                                   </td>
                                                </tr>
                                             </tbody>
                                          </table>
                                       </td>
                                       <td valign="top" width="300" style="width:300px;">
                                          <table align="left" border="0" cellpadding="0" cellspacing="0" style="max-width:300px;" width="100%" class="mcnTextContentContainer">
                                             <tbody>
                                                <tr>
                                                   <td valign="top" class="mcnTextContent" style="text-align: right;">
                                                      <div style="text-align: right; font-size:16px">ClimateCoin © 2022. All rights reserved.<br>
                                                         I don't want to receive these emails anymore
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
</html>`
  await mailer.send('New document', mailContent)
  return createdDocument
}

async function saveNft(data, ownerAddress) {
  const nftsDb = []
  const defaultData = {
    group_id: data.groupId,
    carbon_document: data['carbon_document']._id,
    last_config_txn: null,
  }
  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email: data['carbon_document'].created_by_user,
  })
  const nftsData = [
    {
      ...defaultData,
      nft_type: ALGORAND_ENUMS.NFT_TYPES.DEVELOPER,
      metadata: data.assetNftMetadata,
      asa_id: data.developerAsaId,
      asa_txn_id: data.txn,
      owner_address: userDb.publicAddress,
      supply: data.developerSupply,
    },
    {
      ...defaultData,
      nft_type: ALGORAND_ENUMS.NFT_TYPES.FEE,
      metadata: data.assetNftMetadata,
      asa_id: data.climateFeeNftId,
      asa_txn_id: data.txn,
      owner_address: ownerAddress,
      supply: data.feeSupply,
    },
  ]

  for (const nft of nftsData) {
    const nftDb = await strapi.services['nfts'].create(nft)
    nftsDb.push(nftDb)
  }

  return nftsDb
}

function getBaseMetadata(carbonDocument, options = {}) {
  const mintDefaults = ALGORAND_ENUMS.MINT_DEFAULTS
  if (!carbonDocument || !options.txType) {
    return
  }

  let sdgs = []
  carbonDocument.sdgs.forEach((sdg) => {
    sdgs.push(sdg.name)
  })

  return {
    standard: options.standard ?? ALGORAND_ENUMS.ARCS.ARC69,
    description: options.description ?? `${mintDefaults.METADATA_DESCRIPTION} ${carbonDocument._id}`,
    external_url: options.external_url ?? mintDefaults.EXTERNAL_URL,
    mime_type: options.mime_type ?? ALGORAND_ENUMS.MINT_MIME_TYPES.PDF,
    properties: {
      // project_type: carbonDocument.project_type.name,
      // country: carbonDocument.country.name,
      // sdgs: sdgs.join(',') ?? '',
      title: carbonDocument.title,
      // description: carbonDocument.description,
      // project_url: carbonDocument.project_url,
      // latitude: carbonDocument.project_latitude ?? '',
      // longitude: carbonDocument.project_longitude ?? '',
      credits: carbonDocument.credits,
      serial_number: carbonDocument.serial_number,
      // project_registration: carbonDocument.project_registration,
      // credit_start: carbonDocument.credit_start,
      // credit_end: carbonDocument.credit_end,
      // type: carbonDocument.type.name,
      // subtype: carbonDocument.sub_type.name,
      // methodology: carbonDocument.methodology.name ?? '',
      // validator: carbonDocument.validator.name ?? '',
      // first_verifier: carbonDocument.first_verifier.name ?? '',
      // standard: carbonDocument.standard.name,
      registry: carbonDocument.registry.name,
      // registry_url: carbonDocument.registry_url,
      id: carbonDocument._id,
    },
  }
}

/**
 *
 * @param {algosdk.Algodv2} algodclient
 * @param {*} creator
 * @param {*} carbonDocument
 * @returns
 */
const mintCarbonNft = async (algodclient, creator, carbonDocument) => {
  const atc = new algosdk.AtomicTransactionComposer()
  const indexerClient = algoIndexer()

  const suggestedParams = await algodclient.getTransactionParams().do()
  const assetMetadata = getBaseMetadata(carbonDocument, { txType: ALGORAND_ENUMS.NFT_TYPES.DEVELOPER })

  atc.addMethodCall({
    appID: Number(process.env.APP_ID),
    method: algorandUtils.getMethodByName('mint_developer_nft'),
    sender: creator.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
    suggestedParams,
    note: algorandUtils.encodeMetadataText(assetMetadata),
    methodArgs: [
      Number(carbonDocument.credits),
      Number(process.env.DUMP_APP_ID),
      getEscrowFromApp(Number(process.env.DUMP_APP_ID)),
    ],
  })

  try {
    const result = await atc.execute(algodclient, 2)
    const transactionId = result.txIDs[0]
    const transactionInfo = await indexerClient.searchForTransactions().address(creator.addr).txid(transactionId).do()
    const txnsCfg = transactionInfo.transactions[0]['inner-txns'].filter(
      (transaction) => transaction['tx-type'] === 'acfg',
    )

    const feeAsaTxn = txnsCfg[0]
    const developerAsaTxn = txnsCfg[1]
    const mintData = {
      groupId: developerAsaTxn.group,
      developerAsaId: developerAsaTxn['created-asset-index'],
      txn: transactionId,
      climateFeeNftId: feeAsaTxn['created-asset-index'],
      assetNftMetadata: assetMetadata,
      carbon_document: carbonDocument,
      developerSupply: developerAsaTxn['asset-config-transaction'].params.total,
      feeSupply: feeAsaTxn['asset-config-transaction'].params.total,
    }

    return await saveNft(mintData, creator.addr)
  } catch (error) {
    throw strapi.errors.badRequest(error)
  }
}

async function mint(ctx) {
  const { id } = ctx.params
  // TODO Use indexer to has updated fields
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (!['completed'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been reviewed")
  }

  const algodclient = algoClient()

  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  try {
    const nftsDb = await mintCarbonNft(algodclient, creator, carbonDocument)

    // update carbon document with nfts ids
    const carbonDocuments = await strapi.services['carbon-documents'].update(
      { id },
      {
        ...carbonDocument,
        status: 'minted',
        developer_nft: nftsDb[0],
        fee_nft: nftsDb[1],
      },
    )
    return carbonDocuments
  } catch (error) {
    strapi.log.error(error)
    return { status: error.status, message: error.message }
  }
}

async function claim(ctx) {
  const { id } = ctx.params
  // TODO Use indexer to has updated fields
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })

  if (carbonDocument.created_by_user !== ctx.state.user.email) return ctx.badRequest("Unauthorized")
  if (!['minted'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been minted")
  }

  const algodclient = algoClient()
  const indexerClient = algoIndexer()
  const creator = algosdk.mnemonicToSecretKey(process.env.ALGO_MNEMONIC)

  const userDb = await strapi.plugins['users-permissions'].services.user.fetch({
    email: carbonDocument.created_by_user,
  })
  const developerPublicAddress = userDb.publicAddress

  const developerNft = carbonDocument.developer_nft
  const assetId = Number(developerNft.asa_id)

  await claimNft(algodclient, indexerClient, creator, assetId, developerPublicAddress)

  const updatedCarbonDocument = await strapi.services['carbon-documents'].update(
    { id: carbonDocument },
    { status: 'claimed' },
  )
  await strapi.services.nfts.update({ id: updatedCarbonDocument.developer_nft.id }, { status: 'claimed' })

  return updatedCarbonDocument
}

async function claimNft(algodclient, indexerClient, creator, assetId, developerPublicAddress) {
  const atc = new algosdk.AtomicTransactionComposer()

  const assetInfo = await indexerClient.searchForAssets().index(assetId).do()
  const total = assetInfo.assets[0].params.total

  const suggestedParams = await algodclient.getTransactionParams().do()
  atc.addMethodCall({
    appID: Number(process.env.APP_ID),
    method: algorandUtils.getMethodByName('move'),
    sender: creator.addr,
    signer: algosdk.makeBasicAccountTransactionSigner(creator),
    suggestedParams,
    methodArgs: [
      Number(assetId),
      algorandUtils.getEscrowFromApp(Number(process.env.APP_ID)),
      developerPublicAddress,
      total,
    ],
  })

  const result = await atc.execute(algodclient, 2)

  return result
}

async function prepareSwap(ctx) {
  const { id } = ctx.params
  const user = ctx.state.user
  // TODO Use indexer to has updated fields
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (carbonDocument.id !== id) throw new Error("NFT not found on Strapi")
  if (carbonDocument.created_by_user !== ctx.state.user.email) return ctx.badRequest("Unauthorized")
  if (!['claimed'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been claimed")
  }
  const algodclient = algoClient()
  const suggestedParams = await algodclient.getTransactionParams().do()

  const nftAsaId = carbonDocument.developer_nft?.asa_id.toInt()
  if (!nftAsaId) ctx.badRequest('Missing developer nft')

  const climatecoinVaultAppId = Number(process.env.APP_ID)

  const unfreezeTxn = algosdk.makeApplicationCallTxnFromObject({
    from: user.publicAddress,
    appIndex: climatecoinVaultAppId,
    // the atc appends the assets to the foreignAssets and passes the index of the asses in the appArgs
    appArgs: [algorandUtils.getMethodByName('unfreeze_nft').getSelector(), algosdk.encodeUint64(0)],
    foreignAssets: [nftAsaId],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  unfreezeTxn.fee += 1 * algosdk.ALGORAND_MIN_TX_FEE

  const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: user.publicAddress,
    // the atc appends the assets to the foreignAssets and passes the index of the asses in the appArgs
    assetIndex: nftAsaId,
    to: algosdk.getApplicationAddress(climatecoinVaultAppId),
    amount: carbonDocument.developer_nft.supply.toInt(),
    suggestedParams,
  })

  const swapTxn = algosdk.makeApplicationCallTxnFromObject({
    from: user.publicAddress,
    appIndex: climatecoinVaultAppId,
    // the atc appends the assets to the foreignAssets and passes the index of the asses in the appArgs
    appArgs: [algorandUtils.getMethodByName('swap_nft_to_fungible').getSelector(), algosdk.encodeUint64(1)],
    foreignAssets: [Number(process.env.CLIMATECOIN_ASA_ID), nftAsaId],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams,
  })

  swapTxn.fee += 1 * algosdk.ALGORAND_MIN_TX_FEE

  const swapGroupTxn = [unfreezeTxn, transferTxn, swapTxn]
  const [unfreeze, transfer, swap] = algosdk.assignGroupID(swapGroupTxn)

  const encodedTxns = [unfreeze, transfer, swap].map((txn) => algosdk.encodeUnsignedTransaction(txn))

  return encodedTxns
}

async function swap(ctx) {
  const { id } = ctx.params
  const { signedTxn } = ctx.request.body
  // TODO Use indexer to has updated fields
  const carbonDocument = await strapi.services['carbon-documents'].findOne({ id })
  if (carbonDocument.id !== id) throw new Error("NFT not found on Strapi")
  if (carbonDocument.created_by_user !== ctx.state.user.email) return ctx.badRequest("Unauthorized")
  if (!['claimed'].includes(carbonDocument.status)) {
    return ctx.badRequest("Document hasn't been claimed")
  }
  const algodClient = algoClient()
  const txnBlob = signedTxn.map((txn) => Buffer.from(Object.values(txn)))

  const { txId } = await algodClient.sendRawTransaction(txnBlob).do()
  const result = await algosdk.waitForConfirmation(algodClient, txId, 3)

  const groupId = Buffer.from(result.txn.txn.grp).toString('base64')

  const isGroup = true
  const updatedCarbonDocument = await strapi.services['carbon-documents'].update({ id }, { status: 'swapped' })
  await updateActivity(updatedCarbonDocument.developer_nft.id, txId, isGroup, groupId)

  await strapi.services.nfts.update({ id: updatedCarbonDocument.developer_nft.id }, { status: 'swapped' })

  return updatedCarbonDocument
}

async function updateActivity(nft, txn_id, is_group, group_id) {
  return await strapi.services.activities.update({ nft, type: 'swap' }, { txn_id, is_group, group_id })
}

module.exports = {
  create,
  mint,
  claim,
  swap,
  prepareSwap,
  find,
  findOne
}
