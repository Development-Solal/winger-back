const { body, validationResult } = require('express-validator');

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email format.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { loginValidation, validate };
