import { useBudget, useSetBudget } from '../../application/useBudget';
import { BudgetSettingsForm } from '../BudgetSettingsForm';

/**
 * Attend que le budget soit chargé avant de monter le formulaire (voir `BudgetSettingsForm`).
 * Le formulaire ne se remonte pas quand `budget` change : après son propre enregistrement, son
 * état local reflète déjà ce qu'il vient d'écrire (remonter effacerait le message « Enregistré »
 * avant que l'utilisateur ne le voie). Si le budget change ailleurs (import AirDrop) pendant que
 * ce formulaire est ouvert, l'utilisateur revoit la valeur importée à la prochaine ouverture de
 * l'écran — comme le reste des formulaires de l'application.
 */
export function BudgetSettingsCard() {
  const budget = useBudget();
  const setBudget = useSetBudget();
  if (!budget) return null;
  return <BudgetSettingsForm budget={budget} onSave={setBudget} />;
}
