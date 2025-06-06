import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUser } from '../models/User';
import { Session } from '../models/Session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate JWT tokens for user authentication
   */
  public async generateTokens(user: IUser, userAgent?: string, ipAddress?: string): Promise<AuthTokens> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
      const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

      if (!jwtSecret || !jwtRefreshSecret) {
        throw new Error('JWT secrets not configured');
      }

      // Generate session token
      const sessionToken = this.generateSessionToken();

      // Create session in database
      const session = new Session({
        userId: user._id,
        sessionToken,
        expiresAt: new Date(Date.now() + this.parseExpirationTime(expiresIn)),
        userAgent,
        ipAddress,
        isActive: true,
      });

      await session.save();

      // Create token payload
      const payload: TokenPayload = {
        userId: user._id!.toString(),
        email: user.email,
        role: user.profile.role,
        sessionId: session._id!.toString(),
      };

      // Generate access token
      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn,
        issuer: 'telemedicine-ai',
        audience: 'telemedicine-ai-client',
      });

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: user._id!.toString(), sessionId: session._id!.toString() },
        jwtRefreshSecret,
        {
          expiresIn: refreshExpiresIn,
          issuer: 'telemedicine-ai',
          audience: 'telemedicine-ai-client',
        }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseExpirationTime(expiresIn),
      };
    } catch (error) {
      console.error('Error generating tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify JWT access token
   */
  public async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT secret not configured');
      }

      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'telemedicine-ai',
        audience: 'telemedicine-ai-client',
      }) as TokenPayload;

      // Verify session is still active
      const session = await Session.findById(decoded.sessionId);
      if (!session || !session.isActive || session.isExpired()) {
        throw new Error('Session expired or invalid');
      }

      // Update last activity
      session.lastActivity = new Date();
      await session.save();

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!jwtRefreshSecret) {
        throw new Error('JWT refresh secret not configured');
      }

      const decoded = jwt.verify(refreshToken, jwtRefreshSecret, {
        issuer: 'telemedicine-ai',
        audience: 'telemedicine-ai-client',
      }) as { userId: string; sessionId: string };

      // Find and verify session
      const session = await Session.findById(decoded.sessionId).populate('userId');
      if (!session || !session.isActive || session.isExpired()) {
        throw new Error('Session expired or invalid');
      }

      const user = await import('../models/User').then(m => m.User.findById(decoded.userId));
      if (!user || !user.profile.isActive) {
        throw new Error('User not found or inactive');
      }

      // Refresh session
      session.refresh();
      await session.save();

      // Generate new tokens
      return this.generateTokens(user, session.userAgent, session.ipAddress);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * Revoke session (logout)
   */
  public async revokeSession(sessionToken: string): Promise<void> {
    try {
      await Session.findOneAndUpdate(
        { sessionToken },
        { isActive: false },
        { new: true }
      );
    } catch (error) {
      console.error('Error revoking session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Revoke all user sessions
   */
  public async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      await Session.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );
    } catch (error) {
      console.error('Error revoking all user sessions:', error);
      throw new Error('Failed to revoke user sessions');
    }
  }

  /**
   * Clean up expired sessions
   */
  public async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse expiration time string to milliseconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000; // Default to 24 hours
    }
  }

  /**
   * Generate password reset token
   */
  public generatePasswordResetToken(): { token: string; hashedToken: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return { token, hashedToken, expiresAt };
  }

  /**
   * Verify password reset token
   */
  public verifyPasswordResetToken(token: string, hashedToken: string): boolean {
    const computedHash = crypto.createHash('sha256').update(token).digest('hex');
    return computedHash === hashedToken;
  }
}

export const authService = AuthService.getInstance();
