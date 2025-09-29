import React, { useState } from 'react';
import { FreelancerAccess } from './FreelancerAccess';
import { FreelancerPortal } from './FreelancerPortal';

export const DeveloperView: React.FC = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [codeId, setCodeId] = useState<string>('');
  const [freelancerName, setFreelancerName] = useState<string>('');

  const handleAccessGranted = (verifiedCodeId: string, name?: string) => {
    setCodeId(verifiedCodeId);
    setFreelancerName(name || 'Freelancer');
    setAccessGranted(true);
  };

  const handleBack = () => {
    setAccessGranted(false);
    setCodeId('');
    setFreelancerName('');
  };

  if (accessGranted) {
    return (
      <FreelancerPortal 
        codeId={codeId} 
        freelancerName={freelancerName}
        onBack={handleBack} 
      />
    );
  }

  return (
    <FreelancerAccess onAccessGranted={(codeId) => handleAccessGranted(codeId)} />
  );
};