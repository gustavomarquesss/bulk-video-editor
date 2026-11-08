import { GenerationScreen } from './features/generation/GenerationScreen';
import { isPreviewMode } from './lib/desktop';

export function App() {
  return (
    <>
      {isPreviewMode() && (
        <div className="preview-banner">
          Modo de pré-visualização (fora do Electron): os dados abaixo são simulados.
        </div>
      )}
      <GenerationScreen />
    </>
  );
}
