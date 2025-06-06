import { Request, Response } from 'express';
import { MedicalRecord, RecordStatus, RecordType } from '../models/MedicalRecord';
import { User, UserRole } from '../models/User';
import 'express-async-errors';

/**
 * Get medical records with filtering and pagination
 */
export const getMedicalRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patientId,
      doctorId,
      status,
      recordType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    // Build filter query
    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === UserRole.PATIENT) {
      filter.patientId = req.user.id;
    } else if (req.user?.role === UserRole.DOCTOR) {
      if (patientId) {
        filter.patientId = patientId;
      } else {
        filter.doctorId = req.user.id;
      }
    } else if (req.user?.role === UserRole.ADMIN) {
      // Admins can see all records
      if (patientId) filter.patientId = patientId;
      if (doctorId) filter.doctorId = doctorId;
    }

    // Additional filters
    if (status) filter.status = status;
    if (recordType) filter.recordType = recordType;
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.visitDate = {};
      if (dateFrom) filter.visitDate.$gte = new Date(dateFrom as string);
      if (dateTo) filter.visitDate.$lte = new Date(dateTo as string);
    }

    // Text search
    if (search) {
      filter.$text = { $search: search as string };
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

    // Execute query
    const [records, total] = await Promise.all([
      MedicalRecord.find(filter)
        .populate('patientId', 'profile.fullName email profile.phone profile.dateOfBirth')
        .populate('doctorId', 'profile.fullName email profile.specialization profile.medicalLicense')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MedicalRecord.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext,
          hasPrev,
        },
      },
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical records',
      code: 'FETCH_RECORDS_ERROR',
    });
  }
};

/**
 * Get single medical record by ID
 */
export const getMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findById(id)
      .populate('patientId', 'profile.fullName email profile.phone profile.dateOfBirth profile.gender')
      .populate('doctorId', 'profile.fullName email profile.specialization profile.medicalLicense');

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Medical record not found',
        code: 'RECORD_NOT_FOUND',
      });
      return;
    }

    // Check access permissions
    const canAccess = 
      req.user?.role === UserRole.ADMIN ||
      (req.user?.role === UserRole.PATIENT && record.patientId._id.toString() === req.user.id) ||
      (req.user?.role === UserRole.DOCTOR && record.doctorId?._id.toString() === req.user.id);

    if (!canAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this medical record',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical record',
      code: 'FETCH_RECORD_ERROR',
    });
  }
};

/**
 * Create new medical record
 */
export const createMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    // Only doctors and admins can create medical records
    if (req.user?.role !== UserRole.DOCTOR && req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        error: 'Only doctors and admins can create medical records',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    const recordData = {
      ...req.body,
      doctorId: req.body.doctorId || req.user.id,
    };

    // Verify patient exists
    const patient = await User.findById(recordData.patientId);
    if (!patient || patient.profile.role !== UserRole.PATIENT) {
      res.status(400).json({
        success: false,
        error: 'Invalid patient ID',
        code: 'INVALID_PATIENT',
      });
      return;
    }

    // Create medical record
    const record = new MedicalRecord(recordData);
    await record.save();

    // Populate the record for response
    await record.populate('patientId', 'profile.fullName email profile.phone');
    await record.populate('doctorId', 'profile.fullName email profile.specialization');

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: { record },
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create medical record',
      code: 'CREATE_RECORD_ERROR',
    });
  }
};

/**
 * Update medical record
 */
export const updateMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findById(id);
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Medical record not found',
        code: 'RECORD_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    const canUpdate = 
      req.user?.role === UserRole.ADMIN ||
      (req.user?.role === UserRole.DOCTOR && record.doctorId?.toString() === req.user.id);

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        error: 'Access denied to update this medical record',
        code: 'UPDATE_ACCESS_DENIED',
      });
      return;
    }

    // Update record
    Object.assign(record, req.body);
    await record.save();

    // Populate for response
    await record.populate('patientId', 'profile.fullName email profile.phone');
    await record.populate('doctorId', 'profile.fullName email profile.specialization');

    res.status(200).json({
      success: true,
      message: 'Medical record updated successfully',
      data: { record },
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update medical record',
      code: 'UPDATE_RECORD_ERROR',
    });
  }
};

/**
 * Delete medical record
 */
export const deleteMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await MedicalRecord.findById(id);
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'Medical record not found',
        code: 'RECORD_NOT_FOUND',
      });
      return;
    }

    // Only admins and the creating doctor can delete records
    const canDelete = 
      req.user?.role === UserRole.ADMIN ||
      (req.user?.role === UserRole.DOCTOR && record.doctorId?.toString() === req.user.id);

    if (!canDelete) {
      res.status(403).json({
        success: false,
        error: 'Access denied to delete this medical record',
        code: 'DELETE_ACCESS_DENIED',
      });
      return;
    }

    await MedicalRecord.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Medical record deleted successfully',
    });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete medical record',
      code: 'DELETE_RECORD_ERROR',
    });
  }
};

/**
 * Get medical record statistics
 */
export const getMedicalRecordStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.query;

    // Build filter based on user role
    const filter: any = {};
    if (req.user?.role === UserRole.PATIENT) {
      filter.patientId = req.user.id;
    } else if (req.user?.role === UserRole.DOCTOR) {
      if (patientId) {
        filter.patientId = patientId;
      } else {
        filter.doctorId = req.user.id;
      }
    } else if (patientId) {
      filter.patientId = patientId;
    }

    const stats = await MedicalRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          recordsByType: {
            $push: '$recordType'
          },
          recordsByStatus: {
            $push: '$status'
          },
          latestRecord: { $max: '$createdAt' },
          oldestRecord: { $min: '$createdAt' },
        }
      },
      {
        $project: {
          _id: 0,
          totalRecords: 1,
          latestRecord: 1,
          oldestRecord: 1,
          typeDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$recordsByType'] },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$recordsByType',
                        cond: { $eq: ['$$this', '$$type'] }
                      }
                    }
                  }
                }
              }
            }
          },
          statusDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$recordsByStatus'] },
                as: 'status',
                in: {
                  k: '$$status',
                  v: {
                    $size: {
                      $filter: {
                        input: '$recordsByStatus',
                        cond: { $eq: ['$$this', '$$status'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: stats[0] || {
          totalRecords: 0,
          typeDistribution: {},
          statusDistribution: {},
          latestRecord: null,
          oldestRecord: null,
        },
      },
    });
  } catch (error) {
    console.error('Get medical record stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical record statistics',
      code: 'FETCH_STATS_ERROR',
    });
  }
};
