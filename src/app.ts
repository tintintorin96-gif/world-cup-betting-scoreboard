import { h } from './utils/dom';
import { loadAppData, revalidateMeta } from './services/data-loader';
import type { AppData } from './services/data-loader';
import { renderLeaderboardPage } from './pages/leaderboard';
import { playIntro } from './components/intro';

export let appData: AppData | null = null;

export function createApp(root: HTMLElement) {
  const shell = h('div', { className: 'app-shell' });
  const main = h('main', { className: 'app-main', id: 'app-main' });

  shell.append(main);
  root.append(shell);

  async function ensureData() {
    if (!appData) appData = await loadAppData();
  }

  async function renderContent() {
    main.classList.add('is-loading');
    try {
      await ensureData();
      main.replaceChildren();
      await renderLeaderboardPage(main, appData!);
      main.classList.add('is-visible');
    } catch (err) {
      main.replaceChildren(
        h('div', { className: 'error-panel glass-panel' },
          h('h2', {}, 'Unable to load competition'),
          h('p', {}, err instanceof Error ? err.message : 'Unknown error'),
          h('p', { className: 'hint' }, 'Run npm run scoreboard:data to generate data files.'),
        ),
      );
      main.classList.add('is-visible');
    } finally {
      main.classList.remove('is-loading');
    }
  }

  playIntro(() => {
    void renderContent();
  });

  setInterval(async () => {
    const newMeta = await revalidateMeta();
    if (newMeta) {
      appData = await loadAppData();
      await renderContent();
    }
  }, 60_000);
}
