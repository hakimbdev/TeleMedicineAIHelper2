import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { isDemo } from '../../config/supabase';

const DemoModeNotice: React.FC = () => {
  if (!isDemo) return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm">
          <h3 className="font-medium text-blue-800 mb-1">Demo Mode Active</h3>
          <p className="text-blue-700 mb-2">
            You're running in demo mode with mock authentication. Use the demo accounts below or create a new account to test the application.
          </p>
          <div className="text-xs text-blue-600">
            <strong>Demo Accounts:</strong>
            <br />• Patient: patient@telemedicine.demo / demo123456
            <br />• Doctor: doctor@telemedicine.demo / demo123456  
            <br />• Admin: admin@telemedicine.demo / demo123456
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModeNotice;
