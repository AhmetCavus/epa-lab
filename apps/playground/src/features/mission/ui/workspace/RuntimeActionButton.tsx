import { useTranslation } from 'react-i18next';
import type { MissionWorkspace } from '../../application/useMissionWorkspace';

type RuntimeAction = NonNullable<MissionWorkspace['execution']>['actions'][number];

export function RuntimeActionButton({
  action,
  labelKey = action.labelKey,
  onInvoke,
}: {
  action: RuntimeAction;
  labelKey?: string;
  onInvoke?: (id: string) => void;
}) {
  const { t } = useTranslation('mission');
  return (
    <button
      data-runtime-action={action.id}
      className={action.primary ? 'mc-button mc-primary' : 'mc-button'}
      disabled={action.disabled}
      onClick={() => {
        onInvoke?.(action.id);
        action.invoke();
      }}
    >
      {t(labelKey)}
    </button>
  );
}
