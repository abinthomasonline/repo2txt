/**
 * Complete GitHub form component
 * Combines URL input and authentication for a unified GitHub experience
 */

import { useState } from 'react';
import { GitHubUrlInput } from './GitHubUrlInput';
import { GitHubAuth } from './GitHubAuth';
import { Button } from '@/components/ui/Button';

interface GitHubFormProps {
  onSubmit?: (url: string) => void;
  disabled?: boolean;
}

export function GitHubForm({ onSubmit, disabled = false }: GitHubFormProps) {
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
      <GitHubUrlInput
        onUrlChange={handleUrlChange}
        hideSubmitButton
      />

      <GitHubAuth />

      <Button
        type="button"
        variant="primary"
        size="md"
        disabled={!isValid || disabled}
        onClick={handleSubmit}
        className="w-full"
      >
        Load Repository
      </Button>
    </div>
  );
}
