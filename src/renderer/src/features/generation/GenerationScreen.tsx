import { ResultsPanel } from './components/ResultsPanel';
import { RunPanel } from './components/RunPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPicker } from './components/VideoPicker';
import './generation.css';

export function GenerationScreen() {
  return (
    <main className="generation">
      <aside className="generation__sidebar">
        <VideoPicker />
        <SettingsPanel />
      </aside>
      <div className="generation__content">
        <RunPanel />
        <ResultsPanel />
      </div>
    </main>
  );
}
