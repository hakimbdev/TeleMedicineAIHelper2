import { Request, Response } from 'express';
import { User, UserRole } from '../models/User';
import { authService } from '../services/auth';
import 'express-async-errors';

/**
 * User registration
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      fullName,
      role = UserRole.PATIENT,
      phone,
      dateOfBirth,
      gender,
      medicalLicense,
      specialization,
      department,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
      return;
    }

    // Create user profile
    const userProfile = {
      fullName,
      role,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      medicalLicense,
      specialization,
      department,
      isActive: true,
      preferences: {
        notifications: true,
        emailUpdates: true,
        language: 'en',
        timezone: 'UTC',
      },
    };

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save middleware
      emailVerified: false,
      profile: userProfile,
    });

    await user.save();

    // Generate tokens
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    const tokens = await authService.generateTokens(user, userAgent, ipAddress);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
};

/**
 * User login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Check if account is locked
    if (user.isLocked()) {
      res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
      });
      return;
    }

    // Check if user is active
    if (!user.profile.isActive) {
      res.status(401).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() },
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate tokens
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    const tokens = await authService.generateTokens(user, userAgent, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
};

/**
 * User logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body;

    if (sessionToken) {
      await authService.revokeSession(sessionToken);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    let statusCode = 500;
    let code = 'TOKEN_REFRESH_ERROR';

    if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      statusCode = 401;
      code = 'INVALID_REFRESH_TOKEN';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code,
    });
  }
};

/**
 * Verify session
 */
export const verifySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      res.status(400).json({
        success: false,
        error: 'Session token is required',
        code: 'MISSING_SESSION_TOKEN',
      });
      return;
    }

    // This would require implementing session verification in authService
    // For now, we'll use the existing token verification
    const authHeader = `Bearer ${sessionToken}`;
    req.headers.authorization = authHeader;

    // Use the existing authentication middleware logic
    const payload = await authService.verifyAccessToken(sessionToken);
    const user = await User.findById(payload.userId);

    if (!user || !user.profile.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid session',
        code: 'INVALID_SESSION',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Session is valid',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid session',
      code: 'INVALID_SESSION',
    });
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed',
      code: 'PASSWORD_RESET_REQUEST_ERROR',
    });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN',
      });
      return;
    }

    // Update password
    user.passwordHash = password; // Will be hashed by pre-save middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Revoke all existing sessions
    await authService.revokeAllUserSessions(user._id!.toString());

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
      code: 'PASSWORD_RESET_ERROR',
    });
  }
};
