import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  verifySession,
  requestPasswordReset,
  resetPassword,
} from '../controllers/authController';
import { validate, schemas } from '../middleware/validation';
import { authRateLimit } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validate(schemas.register),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validate(schemas.login),
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify session
 * @access  Public
 */
router.post('/verify', verifySession);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  validate(schemas.passwordResetRequest),
  requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  validate(schemas.passwordReset),
  resetPassword
);

export default router;
