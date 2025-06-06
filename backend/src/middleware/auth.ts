import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/auth';
import { User, UserRole } from '../models/User';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        sessionId: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token
      const payload: TokenPayload = await authService.verifyAccessToken(token);

      // Verify user still exists and is active
      const user = await User.findById(payload.userId);
      if (!user || !user.profile.isActive) {
        res.status(401).json({
          success: false,
          error: 'User not found or inactive',
          code: 'USER_INACTIVE'
        });
        return;
      }

      // Add user info to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
      
      let code = 'INVALID_TOKEN';
      if (errorMessage.includes('expired')) {
        code = 'TOKEN_EXPIRED';
      } else if (errorMessage.includes('Session')) {
        code = 'SESSION_INVALID';
      }

      res.status(401).json({
        success: false,
        error: errorMessage,
        code
      });
      return;
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
    return;
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload: TokenPayload = await authService.verifyAccessToken(token);
      
      const user = await User.findById(payload.userId);
      if (user && user.profile.isActive) {
        req.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role as UserRole,
          sessionId: payload.sessionId,
        };
      }
    } catch (error) {
      // Silently ignore token errors for optional auth
      console.warn('Optional auth token verification failed:', error);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Resource ownership middleware
 * Ensures users can only access their own resources
 */
export const checkResourceOwnership = (resourceUserIdField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // Admins can access all resources
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Get resource user ID from params, body, or query
      const resourceUserId = req.params[resourceUserIdField] || 
                           req.body[resourceUserIdField] || 
                           req.query[resourceUserIdField];

      if (!resourceUserId) {
        res.status(400).json({
          success: false,
          error: 'Resource user ID not provided',
          code: 'MISSING_RESOURCE_ID'
        });
        return;
      }

      // Check if user owns the resource
      if (req.user.id !== resourceUserId) {
        // Doctors can access their patients' resources
        if (req.user.role === UserRole.DOCTOR) {
          // This would require additional logic to check doctor-patient relationships
          // For now, we'll allow doctors to access any patient resource
          // In production, you should implement proper doctor-patient relationship checks
        } else {
          res.status(403).json({
            success: false,
            error: 'Access denied to this resource',
            code: 'RESOURCE_ACCESS_DENIED'
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Resource ownership middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
      return;
    }
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const userAttempts = attempts.get(identifier);
    
    if (userAttempts) {
      if (now > userAttempts.resetTime) {
        // Reset window
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      } else if (userAttempts.count >= maxAttempts) {
        // Rate limit exceeded
        res.status(429).json({
          success: false,
          error: 'Too many authentication attempts',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
        });
        return;
      } else {
        // Increment attempts
        userAttempts.count++;
      }
    } else {
      // First attempt
      attempts.set(identifier, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
};
