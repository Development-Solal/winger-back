const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');


const generateInvoice = (payment, filePath) => {
  const date = new Date(payment.payment_date);

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
  doc.pipe(fs.createWriteStream(filePath));

  // Title
  doc.fontSize(22).font('Helvetica-Bold').text('Facture de Paiement', { align: 'center' });
  doc.moveDown(1);  
  
  //Info
  doc.fontSize(14).font('Helvetica-Bold').text(`Entreprise individuel Christophe CHARLET`, { align: 'left' });
  doc.font('Helvetica').text(`Sunny Lane, 22321 Trou aux Biches, Ile Maurice`, { align: 'left' });
  doc.text(`BRN I23012095`, { align: 'left' });  
  doc.moveDown(1);  

  //Facture Info
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
  doc.text(`Tva: Non Applicable`, { align: 'left' });
  doc.text(`Type d'abonnement: ${payment.subscription_type}`, { align: 'left' });
  doc.text(`Date de paiement : ${formattedDate}`, { align: 'left' });
  doc.text(`Méthode de paiement: ${payment.payment_method || 'PayPal'}`, { align: 'left' });
  doc.moveDown(1);

  // Add horizontal line for better structure
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // Footer
  doc.fontSize(12).font('Helvetica').text('Merci pour votre paiement!', { align: 'center' });
  doc.text('Si vous avez des questions, contactez-nous à contact@winger.fr', { align: 'center' });
  // doc.text('Tél: +1 234 567 890', { align: 'center' });

  doc.end();
};

module.exports = {generateInvoice}
