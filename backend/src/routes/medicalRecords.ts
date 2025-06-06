import { Router } from 'express';
import {
  getMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecordStats,
} from '../controllers/medicalRecordsController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/medical-records
 * @desc    Get medical records with filtering and pagination
 * @access  Private (Patient: own records, Doctor: assigned patients, Admin: all)
 */
router.get('/', getMedicalRecords);

/**
 * @route   GET /api/medical-records/stats
 * @desc    Get medical record statistics
 * @access  Private (Patient: own stats, Doctor: assigned patients, Admin: all)
 */
router.get('/stats', getMedicalRecordStats);

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get single medical record by ID
 * @access  Private (Patient: own records, Doctor: assigned patients, Admin: all)
 */
router.get('/:id', getMedicalRecord);

/**
 * @route   POST /api/medical-records
 * @desc    Create new medical record
 * @access  Private (Doctor, Admin only)
 */
router.post(
  '/',
  authorize(UserRole.DOCTOR, UserRole.ADMIN),
  validate(schemas.createMedicalRecord),
  createMedicalRecord
);

/**
 * @route   PUT /api/medical-records/:id
 * @desc    Update medical record
 * @access  Private (Doctor who created it, Admin)
 */
router.put(
  '/:id',
  authorize(UserRole.DOCTOR, UserRole.ADMIN),
  validate(schemas.updateMedicalRecord),
  updateMedicalRecord
);

/**
 * @route   DELETE /api/medical-records/:id
 * @desc    Delete medical record
 * @access  Private (Doctor who created it, Admin)
 */
router.delete(
  '/:id',
  authorize(UserRole.DOCTOR, UserRole.ADMIN),
  deleteMedicalRecord
);

export default router;
