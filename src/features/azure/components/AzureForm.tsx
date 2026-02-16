/**
 * Complete Azure DevOps form component
 * Combines URL input and authentication for a unified Azure DevOps experience
 */

import { useState } from 'react';
import { AzureUrlInput } from './AzureUrlInput';
import { AzureAuth } from './AzureAuth';
import { Button } from '@/components/ui/Button';

interface AzureFormProps {
  onSubmit?: (url: string) => void;
  disabled?: boolean;
}

export function AzureForm({ onSubmit, disabled = false }: AzureFormProps) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleUrlChange = (newUrl: string, valid: boolean) => {
    setUrl(newUrl);
    setIsValid(valid);
  };

  const handleSubmit = () => {
    if (isValid && url && onSubmit) {
      onSubmit(url);
    }
  };

  return (
    <div className="space-y-4">
      <AzureUrlInput
        onUrlChange={handleUrlChange}
        hideSubmitButton
      />

      <AzureAuth />

      <Button
        type="button"
        variant="primary"
        size="md"
        disabled={!isValid || disabled}
        onClick={handleSubmit}
        className="w-full"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        Load Repository
      </Button>
    </div>
  );
}
