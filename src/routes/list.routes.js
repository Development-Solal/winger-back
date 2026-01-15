const express = require('express');
const router = express.Router();
const { getAllLists , fetchAndLoadCommunes, importTownsFromXlsx, getAllCommunes, getAllTowns, importLanguagesFromXlsx, importNationalitiesFromXlsx, importRegionsFromXlsx, getAllLanguages, getAllNationalities, updateTownCodesFromXlsx} = require('../controllers/list.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware'); 

/**
 * @swagger
 * /api/list/getAll:
 *   get:
 *     summary: Retrieve all list
 *     description: Returns all the available lists
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAll', getAllLists);

/**
 * @swagger
 * /api/list/fetchAndLoadCommunes:
 *   get:
 *     summary: Fetch and store list of communes
 *     description: Fetch and store list of communes into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/fetchAndLoadCommunes', fetchAndLoadCommunes);

/**
 * @swagger
 * /api/list/updateTownCodesFromXlsx:
 *   get:
 *     summary: Fetch and store list of towns + code
 *     description: Fetch and store list of towns + code into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/updateTownCodesFromXlsx', updateTownCodesFromXlsx);

/**
 * @swagger
 * /api/list/importTownsFromXlsx:
 *   get:
 *     summary: Fetch and store list of towns
 *     description: Fetch and store list of towns into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/importTownsFromXlsx', importTownsFromXlsx);

/**
 * @swagger
 * /api/list/importLanguagesFromXlsx:
 *   get:
 *     summary: Fetch and store list of languages
 *     description: Fetch and store list of languages into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/importLanguagesFromXlsx', importLanguagesFromXlsx);

/**
 * @swagger
 * /api/list/importNationalitiesFromXlsx:
 *   get:
 *     summary: Fetch and store list of nationalities
 *     description: Fetch and store list of nationalities into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/importNationalitiesFromXlsx', importNationalitiesFromXlsx);

/**
 * @swagger
 * /api/list/importRegionsFromXlsx:
 *   get:
 *     summary: Fetch and store list of regions
 *     description: Fetch and store list of regions into DB
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/importRegionsFromXlsx', importRegionsFromXlsx);

/**
 * @swagger
 * /api/list/getAllCommunes:
 *   get:
 *     summary: Retrieve lists of all communes
 *     description: Returns the lits of all communes from data.gouv
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllCommunes', getAllCommunes);

/**
 * @swagger
 * /api/list/getAllTowns:
 *   get:
 *     summary: Retrieve lists of all towns
 *     description: Returns the lits of all towns from csv
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllTowns', getAllTowns);

/**
 * @swagger
 * /api/list/getAllLanguages:
 *   get:
 *     summary: Retrieve lists of all languages
 *     description: Returns the lits of all languages from csv
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllLanguages', getAllLanguages);

/**
 * @swagger
 * /api/list/getAllNationalities:
 *   get:
 *     summary: Retrieve lists of all nationalities
 *     description: Returns the lits of all nationalities from csv
 *     tags:
 *      - List   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/getAllNationalities', getAllNationalities);

module.exports = router;