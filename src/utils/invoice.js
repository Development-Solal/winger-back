const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('./logger');
const { uploadToO2Switch, cleanupTempFile } = require('./fileUpload');
const { sendInvoiceEmail } = require('./mail');

const generateInvoice = (payment, id) => {
  return new Promise((resolve, reject) => {
    let date = new Date(payment.payment_date);
    if (isNaN(date.getTime())) {
      logger.warn("Invalid payment date, falling back to today");
      date = new Date();
    }

    const formattedDate = date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const tempFilePath = `/tmp/${id}-invoice.pdf`;
    const writeStream = fs.createWriteStream(tempFilePath);

    // Reject on stream or doc errors
    writeStream.on('error', reject);
    doc.on('error', reject);

    // Only act once the file is fully written to disk
    writeStream.on('finish', async () => {
      try {
        const uploadResult = await uploadToO2Switch(tempFilePath, 'invoice', `${payment.id}`);
        logger.info(`Invoice uploaded: ${uploadResult.url}`);

        // Send email while the temp file still exists
        if (payment.email) {
          await sendInvoiceEmail(
              { email: payment.email, first_name: payment.first_name, last_name: payment.last_name },
              tempFilePath
          );
        }

        resolve(uploadResult);
      } catch (err) {
        logger.error('Invoice upload/email failed', { error: err.message });
        reject(err);
      } finally {
        // Always clean up, even on error
        await cleanupTempFile(tempFilePath).catch(
            e => logger.warn('Temp file cleanup failed', { error: e.message })
        );
      }
    });

    doc.pipe(writeStream);

    // ── Content ────────────────────────────────────────────
    doc.fontSize(22).font('Helvetica-Bold').text('Facture de Paiement', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Entreprise individuelle Christophe CHARLET');
    doc.font('Helvetica').text('Sunny Lane, 22321 Trou aux Biches, Ile Maurice');
    doc.text('BRN I23012095');
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Facturé à');
    doc.moveDown(1);
    doc.font('Helvetica').text(`Facture No: ${payment.id}`);
    doc.text(`Nom: ${payment.first_name} ${payment.last_name}`);
    doc.text(`Email: ${payment.email}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Détails du paiement');
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica').text(`Montant payé: ${payment.price} € TTC`);
    doc.text('Tva incluse: 20%');
    doc.text(`Type d'abonnement: ${payment.subscription_type}`);
    doc.text(`Date de paiement : ${formattedDate}`);
    doc.text(`Méthode de paiement: ${payment.payment_method || 'PayPal'}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica').text('Merci pour votre paiement!', { align: 'center' });
    doc.text('Contactez-nous sur contact@winger.fr', { align: 'center' });
    doc.text('si vous avez des questions ou si votre entreprise est assujettie à la TVA', { align: 'center' });
    doc.text('(merci de nous transmettre votre numéro de TVA).', { align: 'center' });

    doc.end(); // triggers 'finish' on writeStream once all bytes are flushed
  });
};

module.exports = { generateInvoice };
