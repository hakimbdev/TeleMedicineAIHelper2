import { Router } from 'express';
import { User, UserRole } from '../models/User';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import 'express-async-errors';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', async (req, res): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'FETCH_PROFILE_ERROR',
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', validate(schemas.updateProfile), async (req, res): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Update profile fields
    Object.assign(user.profile, req.body);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR',
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authorize(UserRole.ADMIN), async (req, res): Promise<void> => {
  try {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    // Build filter
    const filter: any = {};
    if (role) filter['profile.role'] = role;
    if (isActive !== undefined) filter['profile.isActive'] = isActive === 'true';
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.fullName': { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj: any = {};
    const sortStr = sort as string;
    if (sortStr.startsWith('-')) {
      sortObj[sortStr.substring(1)] = -1;
    } else {
      sortObj[sortStr] = 1;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -resetPasswordToken -resetPasswordExpires -loginAttempts -lockUntil')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      code: 'FETCH_USERS_ERROR',
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private (Admin)
 */
router.get('/:id', authorize(UserRole.ADMIN), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires -loginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      code: 'FETCH_USER_ERROR',
    });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id/status', authorize(UserRole.ADMIN), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value',
        code: 'INVALID_STATUS',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    user.profile.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      code: 'UPDATE_STATUS_ERROR',
    });
  }
});

/**
 * @route   GET /api/users/doctors
 * @desc    Get all doctors
 * @access  Private
 */
router.get('/role/doctors', async (req, res): Promise<void> => {
  try {
    const doctors = await User.find({
      'profile.role': UserRole.DOCTOR,
      'profile.isActive': true,
    })
      .select('profile.fullName profile.specialization profile.department email')
      .sort('profile.fullName')
      .lean();

    res.status(200).json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors',
      code: 'FETCH_DOCTORS_ERROR',
    });
  }
});

export default router;
