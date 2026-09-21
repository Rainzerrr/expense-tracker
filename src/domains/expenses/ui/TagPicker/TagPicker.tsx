import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Tag } from '@/domains/categorization';
import { ChoiceChip } from '@/shared/ui/atoms/ChoiceChip';
import { Icon } from '@/shared/ui/atoms/Icon';
import './TagPicker.scss';

export interface TagPickerProps {
  legend: string;
  addLabel: string;
  newTagLabel: string;
  tags: Tag[];
  selectedIds: string[];
  onChange: (tagIds: string[]) => void;
  getLabel: (tag: Tag) => string;
  /** Crée le tag (ou retrouve l'existant). Null si le nom est inutilisable. */
  onCreate: (name: string) => Promise<Tag | null>;
}

export function TagPicker({
  legend,
  addLabel,
  newTagLabel,
  tags,
  selectedIds,
  onChange,
  getLabel,
  onCreate,
}: TagPickerProps) {
  const name = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  // Entrée puis perte de focus déclencheraient deux créations.
  const committing = useRef(false);

  const toggle = (tagId: string, checked: boolean) =>
    onChange(checked ? [...selectedIds, tagId] : selectedIds.filter((id) => id !== tagId));

  const close = () => {
    setDraft('');
    setAdding(false);
  };

  const commit = async () => {
    if (committing.current) return;
    committing.current = true;
    try {
      const tag = draft.trim() === '' ? null : await onCreate(draft);
      if (tag && !selectedIds.includes(tag.id)) onChange([...selectedIds, tag.id]);
      close();
    } finally {
      committing.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Entrée ajoute le tag, elle ne doit pas enregistrer la dépense.
      event.preventDefault();
      void commit();
    }
    if (event.key === 'Escape') close();
  };

  return (
    <fieldset className="tag-picker">
      <legend className="tag-picker__legend">{legend}</legend>
      <div className="tag-picker__options">
        {adding ? (
          <input
            className="tag-picker__input"
            type="text"
            aria-label={newTagLabel}
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="none"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- le champ vient d'être demandé par l'utilisateur
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => void commit()}
          />
        ) : (
          <button type="button" className="tag-picker__add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            {addLabel}
          </button>
        )}
        {tags.map((tag) => (
          <ChoiceChip
            key={tag.id}
            type="checkbox"
            name={name}
            value={tag.id}
            checked={selectedIds.includes(tag.id)}
            onChange={(checked) => toggle(tag.id, checked)}
            label={getLabel(tag)}
            tone="tag"
          />
        ))}
      </div>
    </fieldset>
  );
}
