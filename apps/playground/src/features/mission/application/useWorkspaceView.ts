import { useSearchParams } from 'react-router-dom';

export type WorkspaceMode = 'explore' | 'inspect';
export type WorkspacePanel = 'resources' | 'flow';

export function useWorkspaceView() {
  const [parameters] = useSearchParams();
  const mode: WorkspaceMode = parameters.get('mode') === 'inspect' ? 'inspect' : 'explore';
  const panel: WorkspacePanel = parameters.get('panel') === 'flow' ? 'flow' : 'resources';
  const focusedResources = parameters.get('panel') === 'resources';

  function destination(nextMode: WorkspaceMode, nextPanel: WorkspacePanel = panel) {
    const next = new URLSearchParams({ mode: nextMode, panel: nextPanel });
    if (parameters.getAll('view').includes('fixture')) {
      next.set('view', 'fixture');
    }
    for (const execution of parameters.getAll('execution')) {
      next.append('execution', execution);
    }
    return `?${next.toString()}`;
  }

  return { mode, panel, focusedResources, destination };
}
