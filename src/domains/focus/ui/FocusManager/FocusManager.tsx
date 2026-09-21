import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Catalog } from '@/domains/categorization';
import { useCatalogLabels } from '@/domains/categorization/react';
import { Button } from '@/shared/ui/atoms/Button';
import { IconButton } from '@/shared/ui/atoms/IconButton';
import { FilterSelect } from '@/shared/ui/molecules/FilterSelect';
import { SegmentedControl } from '@/shared/ui/molecules/SegmentedControl';
import { sameTarget } from '../../domain/focus';
import type { Focus, FocusId, FocusKind, FocusTarget } from '../../domain/focus';
import { useFocusLabels } from '../useFocusLabels';
import './FocusManager.scss';

export interface FocusManagerProps {
  focuses: readonly Focus[];
  catalog: Catalog;
  onAdd: (target: FocusTarget) => Promise<unknown>;
  onRemove: (id: FocusId) => Promise<unknown>;
  onMove: (id: FocusId, direction: 'up' | 'down') => Promise<unknown>;
  onDone: () => void;
}

/** Épingler, retirer et réordonner les focus. Toutes les actions sont des boutons : aucun geste caché. */
export function FocusManager({
  focuses,
  catalog,
  onAdd,
  onRemove,
  onMove,
  onDone,
}: FocusManagerProps) {
  const { t } = useTranslation('focus');
  const labels = useCatalogLabels();
  const describe = useFocusLabels(catalog);
  const [kind, setKind] = useState<FocusKind>('subcategory');
  const [choice, setChoice] = useState('');
  // Après un déplacement le nœud change de place : on redonne le focus au bouton pour le clavier.
  // Une ref suffit (pas de rendu à provoquer) ; elle est posée avant l'action, car la liste se met à
  // jour d'elle-même dès que la base a changé.
  const refocus = useRef<{ id: FocusId; direction: 'up' | 'down' } | null>(null);
  useEffect(() => {
    const pending = refocus.current;
    if (!pending) return;
    refocus.current = null;
    const item = document.querySelector(`[data-focus-id="${pending.id}"]`);
    const preferred = item?.querySelector<HTMLButtonElement>(
      `[data-move="${pending.direction}"]:not(:disabled)`,
    );
    const fallback = item?.querySelector<HTMLButtonElement>('[data-move]:not(:disabled)');
    (preferred ?? fallback)?.focus();
  }, [focuses]);

  const move = (id: FocusId, direction: 'up' | 'down') => {
    refocus.current = { id, direction };
    void onMove(id, direction);
  };

  const isPinned = (target: FocusTarget) => focuses.some((focus) => sameTarget(focus, target));

  // Ce qu'on peut encore épingler, pour le genre choisi.
  const options = useMemo(() => {
    if (kind === 'category') {
      return catalog.categories
        .filter((c) => !isPinned({ kind, targetId: c.id }))
        .map((c) => ({ value: c.id as string, label: labels.category(c) }));
    }
    if (kind === 'subcategory') {
      return catalog.subcategories
        .filter((s) => !isPinned({ kind, targetId: s.id }))
        .map((s) => {
          const parent = catalog.categories.find((c) => c.id === s.categoryId);
          return {
            value: s.id as string,
            label: `${parent ? labels.category(parent) : ''} › ${labels.subcategory(s)}`,
          };
        });
    }
    return catalog.tags
      .filter((tag) => !isPinned({ kind, targetId: tag.id }))
      .map((tag) => ({ value: tag.id as string, label: labels.tag(tag) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isPinned dépend de `focuses`, déjà listé
  }, [kind, catalog, focuses, labels]);

  const add = async () => {
    if (!choice) return;
    await onAdd({ kind, targetId: choice });
    setChoice('');
  };

  const items = focuses.flatMap((focus) => {
    const description = describe(focus);
    return description ? [{ focus, description }] : [];
  });

  return (
    <div className="focus-manager">
      <div className="focus-manager__body">
        <section className="focus-manager__section">
          <h3 className="focus-manager__heading">{t('manager.current')}</h3>
          {items.length === 0 ? (
            <p className="focus-manager__empty">{t('manager.none')}</p>
          ) : (
            <ol className="focus-manager__list">
              {items.map(({ focus, description }, index) => (
                <li key={focus.id} className="focus-manager__item" data-focus-id={focus.id}>
                  <span className="focus-manager__text">
                    <span className="focus-manager__name">{description.name}</span>
                    <span className="focus-manager__subtitle">{description.subtitle}</span>
                  </span>
                  <span className="focus-manager__actions">
                    <IconButton
                      icon="arrowUp"
                      label={t('manager.moveUp', { name: description.name })}
                      data-move="up"
                      disabled={index === 0}
                      onClick={() => move(focus.id, 'up')}
                    />
                    <IconButton
                      icon="arrowDown"
                      label={t('manager.moveDown', { name: description.name })}
                      data-move="down"
                      disabled={index === items.length - 1}
                      onClick={() => move(focus.id, 'down')}
                    />
                    <IconButton
                      icon="close"
                      label={t('manager.remove', { name: description.name })}
                      onClick={() => void onRemove(focus.id)}
                    />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="focus-manager__section">
          <h3 className="focus-manager__heading">{t('manager.add.title')}</h3>
          <SegmentedControl
            label={t('manager.add.kind')}
            value={kind}
            onChange={(next) => {
              setKind(next);
              setChoice('');
            }}
            options={[
              { value: 'category', label: t('manager.add.kinds.category') },
              { value: 'subcategory', label: t('manager.add.kinds.subcategory') },
              { value: 'tag', label: t('manager.add.kinds.tag') },
            ]}
          />
          {options.length === 0 ? (
            <p className="focus-manager__empty">{t('manager.add.allPinned')}</p>
          ) : (
            <div className="focus-manager__add">
              <FilterSelect
                label={t('manager.add.select')}
                emptyLabel={t('manager.add.choose')}
                value={choice}
                options={options}
                onChange={setChoice}
              />
              <Button disabled={!choice} onClick={() => void add()}>
                {t('manager.add.submit')}
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className="focus-manager__footer">
        <Button variant="secondary" onClick={onDone}>
          {t('manager.done')}
        </Button>
      </div>
    </div>
  );
}
