const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const axios = require("axios");

function generateEmailToken() {
    return crypto.randomBytes(32).toString("hex"); // Generate a secure random token
}

function generateEmailTokenMobile() {
    const bytes = crypto.randomBytes(3); // 3 bytes = 24 bits
    const number = bytes.readUIntBE(0, 3) % 1000000; // Modulo to get a number < 1,000,000
    return number.toString().padStart(6, "0"); // Ensure it's always 6 digits
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take your messages");
    }
});


const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: "Confirmez votre adresse email",
        html: `
      <p>Bonjour ${user.first_name},</p>
      <p>Merci pour votre inscription ! Veuillez confirmer votre adresse e-mail en cliquant sur le lien ci-dessous:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>Si vous n'avez pas créé ce compte, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      <br>
      <p>L'équipe WINGer</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email verification sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

const sendVerificationEmailMobile = async (user, token) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: "Confirmez votre adresse email",
        html: `
      <p>Bonjour ${user.first_name},</p>
      <p>Merci pour votre inscription ! Veuillez insérer les codes à 6 chiffres suivants dans l'application mobile:</p>
      <strong>${token}</strong>
      <p>Si vous n'avez pas créé ce compte, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      <br>
      <p>L'équipe WINGer</p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email verification sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

const sendResetPasswordEmail = async (user, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: "Demande de réinitialisation du mot de passe",
        html: `
      <p>Hello ${user.first_name},</p>
      <p>Veuillez réinitialiser votre mot de passe en cliquant sur le lien ci-dessous:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <br>
      <p>L'équipe WINGer</p>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

const sendInvoiceEmail = async (user, pdfPath) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: "Merci pour votre paiement",
        html: `
    <p>Hello ${user.first_name},</p>
    <p>Merci pour votre paiement ! Veuillez trouver votre facture en pièce jointe.</p>
    <br>
    <p>L'équipe WINGer</p>`,
        attachments: [
            {
                filename: path.basename(pdfPath),
                path: pdfPath,
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Invoice sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

const sendContactForm = async (req, res) => {
    const {name, email, subject, message, token, botField} = req.body;

    if (botField) {
        return res.status(400).json({message: "Spam détecté (botField rempli)"});
    }

    // if (!token) {
    //     return res.status(400).json({message: "reCAPTCHA token manquant"});
    // }

    // const secretKey = process.env.RECAPTCHA_SECRET_KEY; // store securely
    // const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        // const response = await axios.post(verificationURL);
        // const data = response.data;
        //
        // if (!data.success) {
        //     return res.status(403).json({message: "Échec de la vérification reCAPTCHA"});
        // }

        const mailOptions = {
            from: '"WINGer Contact" <contact@winger.fr>',
            // to: 'support@winger.fr', // your support or contact email
            to: "contact@winger.fr", // your support or contact email
            subject: `Nouveau message de contact: ${subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <h2 style="color: #e11d48;">Nouveau message depuis le formulaire de contact</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 120px;">Nom :</td>
              <td style="padding: 8px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Email :</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Sujet :</td>
              <td style="padding: 8px;">${subject}</td>
            </tr>
          </table>
      
          <div style="margin-top: 30px;">
            <p style="font-weight: bold; margin-bottom: 10px;">Message :</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #e11d48; white-space: pre-wrap; line-height: 1.6;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>
        </div>

        <br>
        <p>L'équipe WINGer</p>
      `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({message: "Email envoyé avec succès"});
    } catch (error) {
        console.error("Erreur lors de l’envoi:", error);
        res.status(500).json({message: "Erreur lors de l’envoi de l’email"});
    }
};

const sendMessageEmail = async (user) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: "💌 Nouveau message reçu sur WINGer !",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color:#E1003A;">Bonjour ${user.first_name},</h2>
  
        <p style="font-size: 16px; color: #333;">Vous avez reçu un <strong>nouveau message</strong> sur <strong>WINGer</strong> !</p>
  
        <div style="background-color: #fff; padding: 15px 20px; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #555;">Connectez-vous à votre compte pour lire le message et y répondre.</p>
        </div>
  
        <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 20px; background-color: #E1003A; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Voir le message</a>
  
        <p style="font-size: 14px; color: #777; margin-top: 30px;">Merci d'utiliser WINGer. ❤️</p>
      </div>
      <br>
      <p>L'équipe WINGer</p>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Message NOtif sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

/**
 * Send consent request email to Aidé
 */
const sendAideConsentRequestEmail = async (emailAide, aidantFirstName, aidantLastName, consentToken) => {
    const consentUrl = `${process.env.FRONTEND_URL}/register/aide/${consentToken}`;

    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: emailAide,
        subject: 'Bonne nouvelle, vous allez bientôt découvrir WINGer...',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color:#E1003A;">Bonjour,</h2>
        
        <p style="font-size: 16px; color: #333;">
          Bonne nouvelle, <strong>${aidantFirstName} ${aidantLastName}</strong> veut vous inscrire sur 
          <a href="${process.env.FRONTEND_URL}" style="color: #E1003A; text-decoration: none;">www.winger.fr</a> 
          pour vous aider à trouver votre future moitié !
        </p>

        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 15px 0; font-size: 15px; color: #555;">
            En cliquant sur le bouton ci-dessous, vous confirmez avoir <strong>+ de 18 ans</strong> et par votre 
            consentement libre, éclairé et spécifique, vous autorisez WINGer à collecter vos données personnelles.
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${consentUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #E1003A; color: white; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Je donne mon consentement
            </a>
          </div>

          <p style="margin: 15px 0 0 0; font-size: 13px; color: #666; text-align: center;">
            Ou copiez ce lien dans votre navigateur :<br>
            <a href="${consentUrl}" style="color: #E1003A; word-break: break-all;">${consentUrl}</a>
          </p>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          En savoir plus sur vos données personnelles sur WINGer : 
          <a href="${process.env.FRONTEND_URL}/politiques-de-confidentialite" style="color: #E1003A;">
            cliquez ici
          </a>
        </p>

        <p style="font-size: 14px; color: #666;">
          Pour toute question, ou modification de vos préférences ou données personnelles, 
          merci d'envoyer un email à <a href="mailto:contact@winger.fr" style="color: #E1003A;">contact@winger.fr</a>
        </p>

        <p style="font-size: 14px; color: #777; margin-top: 30px;">
          L'équipe WINGer ❤️
        </p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Aide consent request email sent to:', emailAide);
    } catch (error) {
        console.error('Error sending Aide consent email:', error);
        throw error;
    }
};

/**
 * Send confirmation email to Aidant when Aidé accepts
 */
const sendAidantConsentConfirmationEmail = async (aidantEmail, aidantFirstName, emailAide) => {
    const profileUrl = `${process.env.FRONTEND_URL}/compte/profils-aides`;

    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: aidantEmail,
        subject: "Votre Aidé(e) attend son inscription sur WINGer !",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color:#E1003A;">Bonjour ${aidantFirstName},</h2>
        
        <p style="font-size: 16px; color: #333;">
          🎉 <strong>Bonne nouvelle !</strong> Votre Aidé(e), dont l'email est <strong>${emailAide}</strong>, 
          a bien consenti à transmettre ses données personnelles sur WINGer !
        </p>

        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 15px 0; font-size: 15px; color: #555;">
            Rendez-vous dans votre espace <strong>« Mon compte »</strong> pour l'inscrire.
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${profileUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #E1003A; color: white; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Compléter l'inscription
            </a>
          </div>

          <p style="margin: 15px 0 0 0; font-size: 13px; color: #666; text-align: center;">
            Ou copiez ce lien dans votre navigateur :<br>
            <a href="${profileUrl}" style="color: #E1003A; word-break: break-all;">${profileUrl}</a>
          </p>
        </div>

        <p style="font-size: 15px; color: #333; margin-top: 20px;">
          A bientôt sur WINGer, votre Aidé(e) compte sur vous désormais ! 😊
        </p>

        <p style="font-size: 14px; color: #777; margin-top: 30px;">
          L'équipe WINGer ❤️
        </p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Aidant consent confirmation email sent to:", aidantEmail);
    } catch (error) {
        console.error("Error sending Aidant confirmation email:", error);
        throw error;
    }
};

/**
 * Send rejection email to Aidant when Aidé refuses
 */
const sendAidantConsentRejectionEmail = async (aidantEmail, aidantFirstName, emailAide) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: aidantEmail,
        subject: "Votre Aidé(e) ne désire pas être inscrit sur WINGer... 😔",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color:#E1003A;">Bonjour ${aidantFirstName},</h2>
        
        <p style="font-size: 16px; color: #333;">
          Votre Aidé(e), dont l'email est <strong>${emailAide}</strong>, n'a pas consenti à transmettre 
          ses données personnelles sur WINGer.
        </p>

        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #555;">
            Aucune de ses données ne sera donc conservée par WINGer.
          </p>
        </div>

        <p style="font-size: 15px; color: #333;">
          Nous vous invitons à le recontacter pour savoir les raisons de ce refus. 
          Vous pouvez bien sûr le réinscrire à tout moment depuis votre compte.
        </p>

        <p style="font-size: 15px; color: #333; margin-top: 20px;">
          A bientôt !
        </p>

        <p style="font-size: 14px; color: #777; margin-top: 30px;">
          L'équipe WINGer ❤️
        </p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Aidant consent rejection email sent to:", aidantEmail);
    } catch (error) {
        console.error("Error sending Aidant rejection email:", error);
        throw error;
    }
};

const sendAidantProVerifiedEmailToAdmin = async (user) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: "contact@winger.fr",
        subject: `Inscription Aidant pro [${user.ProfileAidantPro.company_name}]`,
        html: `
            <p>Bonjour</p>
            <p>Cet Aidant pro souhaite rentrer en contact avec WINGer pour inscrire un ou plusieurs de ses clients sur le site et l'appli :</p>
                     <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tbody>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Prenom :</strong></td>
                        <td style="padding: 8px 12px;">${user.first_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Nom :</strong></td>
                        <td style="padding: 8px 12px;">${user.last_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Nom de l'entreprise :</strong></td>
                        <td style="padding: 8px 12px;">${user.ProfileAidantPro.company_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Grande ville la plus proche :</strong></td>
                        <td style="padding: 8px 12px;">${user.town.town}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Numéro de SIRET :</strong></td>
                        <td style="padding: 8px 12px;">${user.ProfileAidantPro.company_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; vertical-align: top;"><strong>Email :</strong></td>
                        <td style="padding: 8px 12px;">${user.email}</td>
                    </tr>
                </tbody>
            </table>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email verification sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

const sendAidantProContractSignedEmail = async (user) => {
    const mailOptions = {
        from: '"WINGer" <contact@winger.fr>',
        to: user.email,
        subject: `Votre inscription sur WINGer est désormais active !`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color:#E1003A;">Bonjour</h2>
        
        <p style="font-size: 16px; color: #333;">
          Le contrat signé entre WINGer et votre entreprise vous permet désormais
            d'inscrire vos Aidé(e)s sur le site !
        </p>
        
           <p style="font-size: 16px; color: #333;">
           Rappel : en tant que professionnel, votre nombre d'Aidé(e)s inscrits est illimité,
            donc il n'y aura pas de jaloux ou jalouse ! :)
        </p>
   

        <p style="font-size: 15px; color: #333;">
         En souhaitant de belles rencontres pour votre clientèle
        </p>

        <p style="font-size: 15px; color: #333; margin-top: 20px;">
         Cordialement,
        </p>

        <p style="font-size: 14px; color: #777; margin-top: 30px;">
          L'équipe WINGer 
        </p>
      </div>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email verification sent");
    } catch (error) {
        console.error("Error sending mail: ", error);
        throw error;
    }
};

module.exports = {
    generateEmailToken,
    generateEmailTokenMobile,
    sendVerificationEmail,
    sendVerificationEmailMobile,
    sendResetPasswordEmail,
    sendInvoiceEmail,
    sendContactForm,
    sendMessageEmail,
    sendAideConsentRequestEmail,
    sendAidantConsentConfirmationEmail,
    sendAidantConsentRejectionEmail,
    sendAidantProVerifiedEmailToAdmin,
    sendAidantProContractSignedEmail
};
