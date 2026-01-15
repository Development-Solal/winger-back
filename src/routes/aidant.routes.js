const express = require('express');
const router = express.Router();
const { createProfileAidant, createProfileAidantPro, createProfileAidantMobile, createProfileAidantProMobile, updateProfileAidant, updateProfileAidantPro, deactivateProfileAidant,aidantDeactivateProfileAidant
} = require('../controllers/aidant.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/aidant/create:
 *   post:
 *     summary: Create a new aidant
 *     description: Returns the details of the newly created aidant user
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/create', createProfileAidant);

/**
 * @swagger
 * /api/aidant/createMob:
 *   post:
 *     summary: Create a new aidant mobile
 *     description: Returns the details of the newly created aidant user mobile
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/createMob', createProfileAidantMobile);

/**
 * @swagger
 * /api/aidant/createPro:
 *   post:
 *     summary: Create a new aidant pro
 *     description: Returns the details of the newly created aidant pro user
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/createPro', createProfileAidantPro);

/**
 * @swagger
 * /api/aidant/createProMob:
 *   post:
 *     summary: Create a new aidant pro mobile
 *     description: Returns the details of the newly created aidant pro user on mobile
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/createProMob', createProfileAidantProMobile);

/**
 * @swagger
 * /api/aidant/update:
 *   put:
 *     summary: Update an aidant
 *     description: Returns the details of the newly updated aidant user
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/update/:userId', authenticateToken, updateProfileAidant);

router.post('/update-new/:userId', authenticateToken, updateProfileAidant);


/**
 * @swagger
 * /api/aidant/updatePro:
 *   put:
 *     summary: Update an aidant pro
 *     description: Returns the details of the newly updated aidant pro user
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/updatePro/:userId', authenticateToken, updateProfileAidantPro);

/**
 * @swagger
 * /api/aidant/deactivate:
 *   put:
 *     summary: Deactivate an aidant
 *     description: Deactivate an aidant and linked aide
 *     tags:
 *      - Aidant   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/deactivate/:userId', authenticateToken, deactivateProfileAidant);


/**
 * @swagger
 * /api/aidant/deactivate-aidant:
 *   put:
 *     summary: Aidant suspends his account
 *     description: Deactivate an aidant and linked aide
 *     tags:
 *      - Aidant
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/deactivate-aidant/:userId', authenticateToken, aidantDeactivateProfileAidant);



module.exports = router;