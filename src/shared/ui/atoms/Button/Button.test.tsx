import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('est de type button par défaut (ne soumet pas un formulaire)', () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole('button', { name: 'Valider' })).toHaveAttribute('type', 'button');
  });

  it('déclenche onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
