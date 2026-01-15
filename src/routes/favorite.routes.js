const express = require('express');
const router = express.Router();
const { addFavorite, getFavorites } = require('../controllers/favorite.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/favorite/addFavorite:
 *   post:
 *     summary: Aidant adding an aide as favorite
 *     description: Aidant adding an aide as favorite
 *     tags:
 *      - Favorite
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/addFavorite', authenticateToken, addFavorite);

/**
 * @swagger
 * /api/favorite/getFavorites:
 *   post:
 *     summary: Get all fav for this aidant
 *     description: Retrieve all the fav of my aidant
 *     tags:
 *      - Favorite
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/getFavorites', authenticateToken, getFavorites);

module.exports = router;