import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaperPmfPromo } from '../PaperPmfPromo';

const expectedDestination =
  'https://paperpmf.com/?utm_source=repo2txt&utm_medium=referral&utm_campaign=paperpmf_crosspromo_2026&utm_content=context_strip#diagnostic-intake';

describe('PaperPmfPromo', () => {
  it('renders the campaign copy and a safe, accessible external link', () => {
    render(<PaperPmfPromo />);

    expect(screen.getByText('NEXT CONTEXT')).toBeInTheDocument();
    expect(
      screen.getByText(
        'From code context to market context—explore synthetic purchase intent with PaperPMF.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Run free diagnostic →')).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: /Run free diagnostic \(opens in a new tab\)$/,
    });

    expect(link).toHaveAttribute('href', expectedDestination);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
