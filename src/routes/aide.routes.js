const express = require('express');
const router = express.Router();
const { getAllProfileAides, getAllAideByAidant, getProfileAideById, getFutureMoitieById, createProfileAide, updateProfileAide, updateFutureMoitie,deactivateProfileAide,
    suspendAideProfile
} = require('../controllers/aide.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware'); 
const aideConsentController = require('../controllers/aideConsent.controller');
/**
 * @swagger
 * /api/aide/getAll:
 *   get:
 *     summary: Get all aide
 *     description: Returns the details of all aides
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAll', authenticateToken, getAllProfileAides);

/**
 * @swagger
 * /api/aide/getAllAide:
 *   get:
 *     summary: Get all aides
 *     description: Returns the details of all aidess
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllAide/:userId', authenticateToken, getAllAideByAidant);

/**
 * @swagger
 * /api/aide/getById/:id:
 *   get:
 *     summary: Get a specific aide
 *     description: Returns the details of one aide
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getById/:id', authenticateToken, getProfileAideById);

/**
 * @swagger
 * /api/aide/getFutureMoitieById/:id:
 *   get:
 *     summary: Get the future moitie of an aide
 *     description: Returns the details of a future moitie
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getFutureMoitieById/:id', authenticateToken, getFutureMoitieById);

/**
 * @swagger
 * /api/aide/create:
 *   post:
 *     summary: Create a profile Aide
 *     description: Returns the details of the created aide
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/create', authenticateToken, createProfileAide);

/**
 * @swagger
 * /api/aide/update/:aideId:
 *   put:
 *     summary: Update an aide
 *     description: Returns the details of the udpated aide
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/update/:aideId', authenticateToken, updateProfileAide);
router.post('/update/:aideId', authenticateToken, updateProfileAide);

/**
 * @swagger
 * /api/aide/updateFutureMoitie/:aideId:
 *   put:
 *     summary: Update a future moitie
 *     description: Returns the details of the udpated future moitie
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/updateFutureMoitie/:aideId', authenticateToken, updateFutureMoitie);

/**
 * @swagger
 * /api/aide/deactivate:
 *   put:
 *     summary: Deactivate an aide
 *     description: Deactivate an aide
 *     tags:
 *      - Aide   
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/deactivate/:aideId', authenticateToken, deactivateProfileAide);
router.put('/suspend/:aideId', authenticateToken, suspendAideProfile);
router.get('/with-consent', authenticateToken, aideConsentController.getAllAidesWithConsent);

module.exports = router;