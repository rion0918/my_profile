export type AudioState = 'off' | 'waiting' | 'loading' | 'playing' | 'paused' | 'error';
type Media = Pick<HTMLAudioElement, 'src' | 'loop' | 'preload' | 'volume' | 'play' | 'pause' | 'removeAttribute' | 'load'>;

export function createWorldAudio(media: Media, onState: (state: AudioState) => void) {
  let state: AudioState = 'waiting', enabled = true, visible = true, disposed = false, request = 0;
  media.preload = 'none'; media.loop = true; media.volume = 0.5;
  const emit = (next: AudioState) => { state = next; if (!disposed) onState(next); };
  const fail = () => {
    if (disposed || !enabled) return;
    enabled = false; request++; media.pause(); emit('error');
  };
  const play = async () => {
    const ticket = ++request;
    emit('loading');
    if (!media.src) media.src = '/audio/bossa-antigua.mp3';
    try {
      await media.play();
      if (disposed || !enabled || !visible) { media.pause(); return; }
      if (ticket === request) emit('playing');
    } catch (error) {
      if (ticket !== request) return;
      if (error instanceof Error && error.name === 'NotAllowedError') emit('waiting');
      else fail();
    }
  };
  return {
    get state() { return state; },
    async enable() {
      if (disposed) return;
      if (state === 'error' && media.src) media.load();
      enabled = true;
      if (visible) await play(); else emit('paused');
    },
    async unlock() {
      if (!disposed && enabled && visible && state === 'waiting') await play();
    },
    disable() { enabled = false; request++; media.pause(); emit('off'); },
    async setVisible(value: boolean) {
      if (disposed || visible === value) return;
      visible = value;
      if (!enabled) return;
      if (visible) await play();
      else { request++; media.pause(); emit('paused'); }
    },
    setVolume(value: number) { media.volume = Math.max(0, Math.min(1, value)); },
    fail,
    dispose() { disposed = true; enabled = false; request++; media.pause(); media.removeAttribute('src'); media.load(); },
  };
}
