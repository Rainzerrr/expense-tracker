import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NoticeBanner } from './NoticeBanner';

describe('NoticeBanner', () => {
  it('propose une action par lien classique', () => {
    render(<NoticeBanner message="Démo" actionLabel="Quitter" href="/?demo=0" />);
    expect(screen.getByRole('link', { name: 'Quitter' })).toHaveAttribute('href', '/?demo=0');
  });

  it('propose une navigation dans l’application', () => {
    render(
      <MemoryRouter>
        <NoticeBanner message="Rappel" actionLabel="Sauvegarder" to="/settings" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Sauvegarder' })).toHaveAttribute('href', '/settings');
  });

  it('propose une action sur place : un bouton, pas un lien', async () => {
    const onAction = vi.fn();
    render(<NoticeBanner message="Mise à jour" actionLabel="Mettre à jour" onAction={onAction} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
