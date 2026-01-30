const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const {uploadToO2Switch, cleanupTempFile} = require("./fileUpload");


const generateInvoice = async (payment, id) => {
  let date = new Date(payment.payment_date);

  // Fallback to today's date if invalid
  if (isNaN(date.getTime())) {
    logger.warn("Invalid payment date provided, falling back to today's date");
    date = new Date();
  }

  const formattedDate = date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  logger.info("Parsed date:", date);
  logger.info("Formatted date:", formattedDate);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const tempFilePath = `/tmp/${id}-invoice.pdf`; // Temporarily saving the file

  doc.pipe(fs.createWriteStream(tempFilePath));

  // Title
  doc.fontSize(22).font('Helvetica-Bold').text('Facture de Paiement', { align: 'center' });
  doc.moveDown(1);

  // Info
  doc.fontSize(14).font('Helvetica-Bold').text(`Entreprise individuelle Christophe CHARLET`, { align: 'left' });
  doc.font('Helvetica').text(`Sunny Lane, 22321 Trou aux Biches, Ile Maurice`, { align: 'left' });
  doc.text(`BRN I23012095`, { align: 'left' });
  doc.moveDown(1);

  // Facture Info
  doc.fontSize(14).font('Helvetica-Bold').text('Facturé à', { align: 'left' });
  doc.moveDown(1);

  doc.font('Helvetica').text(`Facture No: ${payment.id}`, { align: 'left' });
  doc.text(`Nom: ${payment.first_name} ${payment.last_name}`, { align: 'left' });
  doc.text(`Email: ${payment.email}`, { align: 'left' });
  doc.moveDown(1);

  // Payment Info
  doc.fontSize(14).font('Helvetica-Bold').text('Détails du paiement', { align: 'left' });
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica').text(`Montant payé: ${payment.price} € TTC`, { align: 'left' });
  doc.text(`Tva incluse: 20%`, { align: 'left' });
  doc.text(`Type d'abonnement: ${payment.subscription_type}`, { align: 'left' });
  doc.text(`Date de paiement : ${formattedDate}`, { align: 'left' });
  doc.text(`Méthode de paiement: ${payment.payment_method || 'PayPal'}`, { align: 'left' });
  doc.moveDown(1);

  // Add horizontal line for better structure
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

 // Footer
  doc.fontSize(12).font('Helvetica').text('Merci pour votre paiement!', { align: 'center' });
  doc.text('Contactez-nous sur contact@winger.fr', { align: 'center' });
  doc.text('si vous avez des questions ou si votre entreprise est assujettie à la TVA', { align: 'center' });
  doc.text('(merci de nous transmettre votre numéro de TVA).', { align: 'center' });

  doc.end();

  // Wait for PDF to be fully created
  doc.on('end', async () => {
    try {
      // Upload the invoice to O2Switch
      const uploadResult = await uploadToO2Switch(tempFilePath, 'invoice', `${payment.id}.pdf`);

      // Cleanup the temporary file
      await cleanupTempFile(tempFilePath);

      logger.info(`Invoice uploaded successfully to O2Switch: ${uploadResult.url}`);

      // Return the result, so that the webhook handler can use the URL
      return uploadResult;
    } catch (error) {
      logger.error("Error uploading invoice to O2Switch:", error);
      throw error;
    }
  });
};


module.exports = {generateInvoice}
