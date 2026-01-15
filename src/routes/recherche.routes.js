const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/autheticationMiddleware');
const { searchByProfileNumber, searchByFilter, searchAll, searchAideByFM, searchFMbyAide, getFiche, getFicheFutureMoitie, getAllAideByAidant } = require('../controllers/recherche.controller');

/**
 * @swagger
 * /api/recherche/searchByProfileNumber:
 *   post:
 *     summary: Search an aidant by his profile number
 *     description: Return the searched aidant by his profile number
 *     tags:
 *      - Recherche
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileNumber:
 *                 type: string
 *                 description: The profile number of the aidant to search for
 *                 example: "PAR-1"   
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/searchByProfileNumber', searchByProfileNumber);

/**
 * @swagger
 * /api/recherche/searchByFilter:
 *   post:
 *     summary: Search aide with standard filters
 *     description: Search aide based on gender, age, and location (town, departement, prefecture)
 *     tags:
 *       - Recherche
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gender:
 *                 type: string
 *                 enum: [Homme, Femme]
 *               age:
 *                 type: integer
 *                 description: Specific age to filter by
 *               departement:
 *                 type: integer
 *                 description: Departement to filter by
 *               prefecture:
 *                 type: integer
 *                 description: ID of the prefecture to filter by
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/searchByFilter', searchByFilter);

/**
 * @swagger
 * /api/recherche/searchAll:
 *   post:
 *     summary: Search all aides
 *     description: Return the all  aides
 *     tags:
 *      - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/searchAll', searchAll)

/**
 * @swagger
 * /api/recherche/searchAideByFM:
 *   post:
 *     summary: Search aide with FM criteria
 *     description: Search aide based on Future Moitie criteria
 *     tags:
 *       - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/searchAideByFM/:aideId', authenticateToken, searchAideByFM);

/**
 * @swagger
 * /api/recherche/searchFMbyAide:
 *   post:
 *     summary: Search FM with aide criteria
 *     description: Search FM based on  aide criteria
 *     tags:
 *       - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/searchFMbyAide/:aideId', authenticateToken, searchFMbyAide);

/**
 * @swagger
 * /api/recherche/getFiche:
 *   post:
 *     summary: Get the details of the selected aidant and aide
 *     description: Get all the advanced details of the selected aidant aide
 *     tags:
 *       - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/getFiche/:encodedAideId', authenticateToken, getFiche);
/**
 * @swagger
 * /api/recherche/getFicheFutureMoitie:
 *   post:
 *     summary: Get the details of the selected aide's future moitie
 *     description: Get all the advanced details of the selected aide's future moitie
 *     tags:
 *       - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/getFicheFutureMoitie/:encodedAideId', authenticateToken, getFicheFutureMoitie);

/**
 * @swagger
 * /api/recherche/getAllAideByAidant:
 *   post:
 *     summary: Get all other aides for this aidant
 *     description: Get all the aides of the selected aidant
 *     tags:
 *       - Recherche
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/getAllAideByAidant/:encodedAidantId', authenticateToken, getAllAideByAidant);

module.exports = router;