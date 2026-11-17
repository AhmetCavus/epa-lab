import { useTranslation } from 'react-i18next';
import type { MissionWorkspace } from '../../application/useMissionWorkspace';
import { syntheticResource, type ResourceSelection } from '../../domain/synthetic-resource';

type RuntimeAction = NonNullable<MissionWorkspace['execution']>['actions'][number];

export function ResourceForm({
  action,
  onInvoke,
  selection,
  onChange,
  onFetch,
}: {
  action: RuntimeAction;
  onInvoke: (id: string) => void;
  selection: ResourceSelection;
  onChange: (selection: ResourceSelection) => void;
  onFetch: (selection: ResourceSelection) => void;
}) {
  const { t } = useTranslation('mission');
  const valid =
    selection.resourceType === syntheticResource.resourceType &&
    selection.resourceId === syntheticResource.resourceId;
  return (
    <form
      className="mc-resource-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!action.disabled && valid) {
          onInvoke(action.id);
          onFetch(selection);
        }
      }}
    >
      <fieldset disabled={action.disabled}>
        <legend className="sr-only">{t('control.form.title')}</legend>
        <label>
          {t('control.form.type')}
          <select
            name="resourceType"
            value={selection.resourceType}
            onChange={(event) => onChange({ ...selection, resourceType: event.target.value })}
          >
            <option value={syntheticResource.resourceType}>{syntheticResource.resourceType}</option>
          </select>
        </label>
        <label>
          {t('control.form.id')}
          <input
            name="resourceId"
            value={selection.resourceId}
            onChange={(event) => onChange({ ...selection, resourceId: event.target.value })}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!valid}
            aria-describedby="mc-resource-selection-note"
          />
        </label>
        <button
          type="submit"
          data-runtime-action="resource"
          className={action.primary ? 'mc-button mc-primary' : 'mc-button'}
          disabled={action.disabled || !valid}
        >
          {t('control.fetchResource')}
        </button>
      </fieldset>
      <p id="mc-resource-selection-note" className="mc-resource-selection-note">
        {t('control.form.allowlist')}
      </p>
    </form>
  );
}
