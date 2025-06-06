import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { UserRole } from '../models/User';

/**
 * Generic validation middleware
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Validation schemas
 */
export const schemas = {
  // User registration
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'any.required': 'Password is required',
      }),
    fullName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters long',
        'string.max': 'Full name must not exceed 100 characters',
        'any.required': 'Full name is required',
      }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .default(UserRole.PATIENT)
      .messages({
        'any.only': 'Role must be one of: patient, doctor, admin, nurse',
      }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
    dateOfBirth: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future',
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .optional(),
    medicalLicense: Joi.string()
      .when('role', {
        is: Joi.valid(UserRole.DOCTOR, UserRole.NURSE),
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
      }),
    specialization: Joi.string()
      .when('role', {
        is: UserRole.DOCTOR,
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
      }),
    department: Joi.string()
      .when('role', {
        is: Joi.valid(UserRole.DOCTOR, UserRole.NURSE),
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
      }),
  }),

  // User login
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),

  // Password reset request
  passwordResetRequest: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  // Password reset
  passwordReset: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'any.required': 'Password is required',
      }),
  }),

  // Profile update
  updateProfile: Joi.object({
    fullName: Joi.string()
      .min(2)
      .max(100)
      .optional(),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .optional()
      .allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .optional(),
    address: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    emergencyContact: Joi.object({
      name: Joi.string().max(100).required(),
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
      relationship: Joi.string().max(50).required(),
    }).optional(),
    preferences: Joi.object({
      notifications: Joi.boolean().optional(),
      emailUpdates: Joi.boolean().optional(),
      language: Joi.string().valid('en', 'es', 'fr', 'de').optional(),
      timezone: Joi.string().optional(),
    }).optional(),
  }),

  // Medical record creation
  createMedicalRecord: Joi.object({
    patientId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid patient ID format',
        'any.required': 'Patient ID is required',
      }),
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.min': 'Title is required',
        'string.max': 'Title must not exceed 200 characters',
        'any.required': 'Title is required',
      }),
    description: Joi.string()
      .max(1000)
      .optional()
      .allow(''),
    diagnosis: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    symptoms: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          severity: Joi.string().valid('mild', 'moderate', 'severe').required(),
          duration: Joi.string().required(),
          notes: Joi.string().optional().allow(''),
        })
      )
      .optional(),
    medications: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          dosage: Joi.string().required(),
          frequency: Joi.string().required(),
          startDate: Joi.date().required(),
          endDate: Joi.date().optional(),
          notes: Joi.string().optional().allow(''),
        })
      )
      .optional(),
    vitalSigns: Joi.object({
      temperature: Joi.number().min(90).max(110).optional(),
      bloodPressure: Joi.object({
        systolic: Joi.number().min(70).max(250).required(),
        diastolic: Joi.number().min(40).max(150).required(),
      }).optional(),
      heartRate: Joi.number().min(30).max(200).optional(),
      respiratoryRate: Joi.number().min(8).max(40).optional(),
      oxygenSaturation: Joi.number().min(70).max(100).optional(),
      weight: Joi.number().min(0).max(500).optional(),
      height: Joi.number().min(0).max(300).optional(),
      recordedAt: Joi.date().default(Date.now),
    }).optional(),
    treatmentPlan: Joi.string()
      .max(2000)
      .optional()
      .allow(''),
    notes: Joi.string()
      .max(2000)
      .optional()
      .allow(''),
    recordType: Joi.string()
      .valid('consultation', 'diagnosis', 'prescription', 'lab_result', 'imaging', 'other')
      .default('consultation'),
    visitDate: Joi.date()
      .default(Date.now),
    followUpDate: Joi.date()
      .optional(),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional(),
  }),

  // Medical record update
  updateMedicalRecord: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .optional(),
    description: Joi.string()
      .max(1000)
      .optional()
      .allow(''),
    diagnosis: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    symptoms: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          severity: Joi.string().valid('mild', 'moderate', 'severe').required(),
          duration: Joi.string().required(),
          notes: Joi.string().optional().allow(''),
        })
      )
      .optional(),
    medications: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          dosage: Joi.string().required(),
          frequency: Joi.string().required(),
          startDate: Joi.date().required(),
          endDate: Joi.date().optional(),
          notes: Joi.string().optional().allow(''),
        })
      )
      .optional(),
    treatmentPlan: Joi.string()
      .max(2000)
      .optional()
      .allow(''),
    notes: Joi.string()
      .max(2000)
      .optional()
      .allow(''),
    status: Joi.string()
      .valid('draft', 'active', 'archived')
      .optional(),
    followUpDate: Joi.date()
      .optional(),
    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional(),
  }),
};
