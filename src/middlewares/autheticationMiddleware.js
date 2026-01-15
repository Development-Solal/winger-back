const jwt = require('jsonwebtoken');
const { ProfileAidant } = require('../models');

const authenticateToken =  async  (req, res, next) => {
  let token = req.cookies.accessToken; // Automatically sent by the browser

    // Fallback to Authorization header for mobile
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(403).json({ message: 'Token invalide ou manquant' });
    }
    req.user = user;

    try {
      // Update last_seen_at if the user has a ProfileAidant
      await ProfileAidant.update(
        { last_seen_at: new Date() },
        { where: { user_id: user.id } }
      );
    } catch (updateError) {
      console.error("Erreur lors de la mise à jour de last_seen_at:", updateError);
      // Don't block the request if the update fails
    }
    
    next();
  });
};

module.exports = authenticateToken;
