import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { useStay } from '@/domains/stay/react';
import type { Choices, ImportPlan } from '../domain/importPlan';
import { importStatement, previewStatement } from './statementUseCases';

export function useStatementActions() {
  const { expenses, catalog, merchantRules, now } = useAppServices();
  const stay = useStay();
  return {
    preview: useCallback(
      (text: string) => previewStatement({ expenses, catalog, merchantRules }, text, stay),
      [expenses, catalog, merchantRules, stay],
    ),
    importPlan: useCallback(
      (plan: ImportPlan, choices: Choices) =>
        importStatement({ expenses, catalog, merchantRules }, plan, choices, now()),
      [expenses, catalog, merchantRules, now],
    ),
  };
}
