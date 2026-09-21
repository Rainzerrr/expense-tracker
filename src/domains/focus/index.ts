export { focusMatches, sameTarget } from './domain/focus';
export type { Focus, FocusId, FocusKind, FocusTarget } from './domain/focus';
export type { FocusRepository } from './domain/FocusRepository';
export { focusComposition, focusStats } from './domain/focusStats';
export type { CompositionPart, FocusComposition, FocusStats, WeekBar } from './domain/focusStats';
export { addFocus, moveFocus, removeFocus, seedDemoFocuses } from './application/focusUseCases';
