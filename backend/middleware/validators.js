const { body, query, validationResult } = require('express-validator');

// Common result handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation
];

const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const conversationCreateValidators = [
  body('memberIds').optional().isArray().withMessage('memberIds must be an array'),
  body('isGroup').optional().isBoolean().withMessage('isGroup must be boolean'),
  body('name').optional().isString().trim(),
  handleValidation
];

const addMembersValidators = [
  body('memberIds').isArray({ min: 1 }).withMessage('memberIds must be a non-empty array'),
  handleValidation
];

const getMessagesValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  handleValidation
];

module.exports = {
  registerValidators,
  loginValidators,
  conversationCreateValidators,
  addMembersValidators,
  getMessagesValidators
};