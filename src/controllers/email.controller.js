const  {sendAidantProVerifiedEmailToAdmin, sendAidantProContractSignedEmail} = require('../utils/mail')

const sendAidantProAccountVerifiedMailToAdmin = async (req, res) => {
    try {
        const result = await sendAidantProVerifiedEmailToAdmin(req.body);

        res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (error) {
        console.error('Error sending email to admin', error);
        res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de l'envoi de l'email à l'administrateur après l'acceptation du consentement",
        });
    }
};

const sendAidantProContractSignedEmailToAidant = async (req, res) => {
    try {
        const result = await sendAidantProContractSignedEmail(req.body);

        res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (error) {
        console.error('Error sending email to admin', error);
        res.status(500).json({
            success: false,
            message: error.message || "Erreur lors de l'envoi de l'email à l'Aidant Pro après la mise à jour de la signature du contrat",
        });
    }
};

module.exports = { sendAidantProAccountVerifiedMailToAdmin , sendAidantProContractSignedEmailToAidant };
