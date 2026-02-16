/**
 * Complete GitHub form component
 * Combines URL input and authentication for a unified GitHub experience
 */

import { GitHubUrlInput } from './GitHubUrlInput';
import { GitHubAuth } from './GitHubAuth';

interface GitHubFormProps {
  onSubmit?: (url: string) => void;
}

export function GitHubForm({ onSubmit }: GitHubFormProps) {
  const handleValidUrl = (url: string) => {
    if (onSubmit) {
      onSubmit(url);
    }
  };

  return (
    <div className="space-y-6">
      <GitHubUrlInput onValidUrl={handleValidUrl} />
      <GitHubAuth />
    </div>
  );
}
