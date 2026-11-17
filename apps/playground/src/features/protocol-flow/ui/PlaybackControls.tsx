import { useTranslation } from 'react-i18next';
import type { ProtocolPlayback } from '../application/useProtocolPlayback';

export function PlaybackControls({ playback }: { playback: ProtocolPlayback }) {
  const { t } = useTranslation('protocol-flow');
  return (
    <div
      className="flow-transport"
      role="group"
      aria-label={t('playback.controls')}
      data-playing={playback.playing}
      data-playback-index={playback.index}
    >
      <button className="mc-button" disabled={!playback.canPrevious} onClick={playback.previous}>
        {t('playback.previous')}
      </button>
      <button className="mc-button" disabled={!playback.canPlay} onClick={playback.toggle}>
        {t(playback.playing ? 'playback.pause' : 'playback.play')}
      </button>
      <button className="mc-button" disabled={playback.count === 0} onClick={playback.replay}>
        {t('playback.replay')}
      </button>
      <output aria-live="polite">
        {t('playback.position', { current: playback.index + 1, total: playback.count })}
      </output>
      <button className="mc-button mc-primary" disabled={!playback.canNext} onClick={playback.next}>
        {t('playback.next')}
      </button>
    </div>
  );
}
