const express = require('express');
const router = express.Router();
const { getUserById, getAidantByUser, getAidantProByUser } = require('../controllers/user.controller');
const { sendContactForm } = require('../utils/mail');
const authenticateToken = require('../middlewares/autheticationMiddleware'); 
const { User } = require('../models');

/**
 * @swagger
 * /api/user/getUserById:
 *   get:
 *     summary: Retrive a user detail
 *     description: Returns the details of  a user
 *     tags:
 *      - User  
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getUserById/:userId', authenticateToken, getUserById);

/**
 * @swagger
 * /api/user/getAidantByUser:
 *   get:
 *     summary: Retrive an aidant detail
 *     description: Returns the details of an aidant
 *     tags:
 *      - User  
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAidantByUser/:userId', authenticateToken, getAidantByUser);

/**
 * @swagger
 * /api/user/getAidantProByUser:
 *   get:
 *     summary: Retrive an aidant pro detail
 *     description: Returns the details of an aidant pro
 *     tags:
 *      - User  
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAidantProByUser/:userId', authenticateToken, getAidantProByUser);


/**
 * @swagger
 * /api/user/sendContactForm:
 *   post:
 *     summary: send contact form
 *     description: Send contact form
 *     tags:
 *      - User  
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/sendContactForm', sendContactForm);

/**
 * @swagger
 * /api/user/update-push-token:
 *   post:
 *     summary: Update user push notification token
 *     description: Updates the user's push notification token for mobile notifications
 *     tags:
 *      - User  
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/update-push-token', async (req, res)=> {
    try {
        const {userId, fcmToken} = req.body;

        if(!userId || !fcmToken){
            return res.status(400).json({
                error: 'Missing required fields: userId and expoPushToken'
            });
        }

        //update users push token

        const [updatedCount] = await User.update(
            {
                expo_push_token: fcmToken,
                last_token_update: new Date()
            },
            {
                where: {id: userId}
            }
        );

        if (updatedCount === 0){
            return res.status(404).json({error: 'User not found'});
        }

        console.log(`Updated push token for user ${userId}`);

        res.json({
            success:true,
            message: 'Push token updated successfully'
        });
    } catch (error){
        console.error('Error updating push token: ', error);
        res.status(500).json({
            error: 'Failed to update push token',
            details: error.message
        });
    }
});



module.exports = router;
