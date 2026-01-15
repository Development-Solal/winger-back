const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/autheticationMiddleware');
const { getStats, addListItem, updateListItem, getAllUsers,deactivateUsers, updateUser, getAllAides, deactivateAides, updateAideAidant, downloadInvoicesZip } = require('../controllers/admin.controller');
const {updateAidantProContractSignature} = require("../controllers/aidant.controller");

/**
 * @swagger
 * /api/admin/getStats:
 *   get:
 *     summary: Get all stats of winger
 *     description: Retrieve all stats of winger
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getStats', authenticateToken, getStats);

/**
 * @swagger
 * /api/admin/addListItem/:listType:
 *   post:
 *     summary: Add a new item in a list
 *     description: Add a new items into a list
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/addListItem/:listType', authenticateToken, addListItem);

/**
 * @swagger
 * /api/admin/updateListItem/:listType/:id:
 *   put:
 *     summary: Update an item in a list
 *     description: Update an items into a list
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/updateListItem/:listType/:id', authenticateToken, updateListItem);

/**
 * @swagger
 * /api/admin/getAllUsers:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users on the platform
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllUsers', authenticateToken, getAllUsers);

/**
 * @swagger
 * /api/admin/deactivateUsers/:id:
 *   put:
 *     summary: Deactivate a user
 *     description: Deactivate a user on the platform
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/deactivateUsers/:id', authenticateToken, deactivateUsers);

/**
 * @swagger
 * /api/admin/updateUser/:id:
 *   post:
 *     summary: Update a a user
 *     description: Update info of a user
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
*/
router.post('/updateUser/:id', authenticateToken, updateUser);

/**
 * @swagger
 * /api/admin/getAllAides:
 *   get:
 *     summary: Get all aide
 *     description: Retrieve all aide on the platform
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
*/
router.get('/getAllAides', authenticateToken, getAllAides);

/**
 * @swagger
 * /api/admin/deactivateAides/:id:
 *   put:
 *     summary: Deactivate aan aidé
 *     description: Deactivate aan aidé on the platform
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/deactivateAides/:id', authenticateToken, deactivateAides);
/**
 * @swagger
 * /api/admin/sign-contract-pro:id:
 *   put:
 *     summary: Activate aidant pro contract post signature
 *     description: Activate aidant pro contract post signature
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/sign-contract-pro/:userId', authenticateToken, updateAidantProContractSignature);

/**
 * @swagger
 * /api/admin/updateAideAidant:
 *   post:
 *     summary: Changer l'aidant d'un aidé
 *     description: Changer l'aidant d'un aidé
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/updateAideAidant', authenticateToken, updateAideAidant);

/**
 * @swagger
 * /api/admin/downloadInvoicesZip:
 *   post:
 *     summary: Download invoices zip
 *     description: Download invoices Zip
 *     tags:
 *      - Admin
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/downloadInvoicesZip', authenticateToken, downloadInvoicesZip);

module.exports = router;