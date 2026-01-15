const express = require("express");
const authRoutes = require("./auth.routes");
const aidantRoutes = require("./aidant.routes");
const listRoutes = require("./list.routes");
const aideRoutes = require("./aide.routes");
const userRoutes = require("./user.routes");
const rechercheRoutes = require("./recherche.routes");
const favoriteRoutes = require("./favorite.routes");
const chatRoutes = require("./chat.routes");
const paymentRoutes = require("./payment.routes");
const adminRoutes = require("./admin.routes");
const gdprRoutes = require("./gdprPreferences.routes");
const gdprAideRoutes = require('./gdprAide.routes');
const emailRoutes = require('./email.routes');


const router = express.Router();

//Auth routes
router.use("/auth", authRoutes);

//Aidant routes
router.use("/aidant", aidantRoutes);

//List routes
router.use("/list", listRoutes);

//Aide Routes
router.use("/aide", aideRoutes);

//User Routes
router.use("/user", userRoutes);

//Recherche Routes
router.use("/recherche", rechercheRoutes);

//Fav Routes
router.use("/favorite", favoriteRoutes);

//Chat Routes
router.use("/chat", chatRoutes);

//PAyment Routes
router.use("/payment", paymentRoutes);

//Admin Routes
router.use("/admin", adminRoutes);

//Admin Routes
router.use("/gdpr", gdprRoutes);

router.use("/gdpr-aide", gdprAideRoutes);


router.use("/email", emailRoutes);

module.exports = router;
