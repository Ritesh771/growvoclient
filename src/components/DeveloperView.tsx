import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FreelancerAccess } from './FreelancerAccess';
import { FreelancerPortal } from './FreelancerPortal';

export const DeveloperView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accessGranted, setAccessGranted] = useState(false);
  const [codeId, setCodeId] = useState<string>('');
  const [freelancerName, setFreelancerName] = useState<string>('');

  // Initialize state from URL parameters on component mount
  useEffect(() => {
    const codeIdParam = searchParams.get('codeId');
    const freelancerNameParam = searchParams.get('freelancerName');
    
    if (codeIdParam) {
      setCodeId(codeIdParam);
      setAccessGranted(true);
    }
    if (freelancerNameParam) {
      setFreelancerName(decodeURIComponent(freelancerNameParam));
    }
  }, [searchParams]);

  const handleAccessGranted = (verifiedCodeId: string, name?: string) => {
    const freelancerNameValue = name || 'Freelancer';
    setCodeId(verifiedCodeId);
    setFreelancerName(freelancerNameValue);
    setAccessGranted(true);
    
    // Update URL parameters
    setSearchParams({
      view: 'developer',
      codeId: verifiedCodeId,
      freelancerName: encodeURIComponent(freelancerNameValue)
    });
  };

  const handleBack = () => {
    setAccessGranted(false);
    setCodeId('');
    setFreelancerName('');
    
    // Update URL to go back to developer view without access
    setSearchParams({ view: 'developer' });
  };

  const handleSwitchProject = () => {
    // Clear current session and return to code entry
    setAccessGranted(false);
    setCodeId('');
    setFreelancerName('');
    
    // Update URL to go back to developer view without access
    setSearchParams({ view: 'developer' });
  };

  if (accessGranted) {
    return (
      <FreelancerPortal 
        codeId={codeId} 
        freelancerName={freelancerName}
        onBack={handleBack} 
        onSwitchProject={handleSwitchProject}
      />
    );
  }

  return (
    <FreelancerAccess onAccessGranted={(codeId) => handleAccessGranted(codeId)} />
  );
};