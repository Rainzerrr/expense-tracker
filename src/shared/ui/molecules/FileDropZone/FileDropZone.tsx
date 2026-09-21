import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '@/shared/ui/atoms/Button';
import './FileDropZone.scss';

export interface FileDropZoneProps {
  /** Texte du bouton : « Choisir un fichier ». */
  label: string;
  /** Texte d'aide, visible sur grand écran : « ou dépose-le ici ». */
  hint: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

/** Choisir un fichier au clavier ou au toucher (iPhone), ou le déposer (Mac). Le bouton fait tout : la zone n'est qu'un plus. */
export function FileDropZone({ label, hint, accept, disabled = false, onFile }: FileDropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <div
      className={clsx('file-drop-zone', dragging && 'file-drop-zone--dragging')}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={input}
        className="file-drop-zone__input"
        type="file"
        accept={accept}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Permet de rechoisir le même fichier après une correction.
          event.target.value = '';
        }}
      />
      <Button variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
        {label}
      </Button>
      <p className="file-drop-zone__hint">{hint}</p>
    </div>
  );
}
