import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pwaStub } from '@/test/pwaRegisterStub';
import { UpdatePrompt } from './UpdatePrompt';

afterEach(() => {
  pwaStub.needRefresh = false;
  pwaStub.updateServiceWorker = async () => {};
});

describe('UpdatePrompt', () => {
  it('ne montre rien tant qu’aucune nouvelle version n’est prête', () => {
    render(<UpdatePrompt />);
    expect(screen.queryByText(/nouvelle version/)).not.toBeInTheDocument();
  });

  it('prévient quand une nouvelle version est prête, et recharge seulement au clic', async () => {
    const update = vi.fn(async () => {});
    pwaStub.needRefresh = true;
    pwaStub.updateServiceWorker = update;
    render(<UpdatePrompt />);

    expect(
      screen.getByText("Une nouvelle version de l'application est prête."),
    ).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled(); // jamais de rechargement surprise

    await userEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(update).toHaveBeenCalledExactlyOnceWith(true);
  });
});
