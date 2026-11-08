import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { ProgressBar } from '@renderer/components/ui/ProgressBar';
import { STAGE_LABEL, overallProgress } from '../presentation';
import { useGenerationStore } from '../useGenerationStore';

export function RunPanel() {
  const phase = useGenerationStore((state) => state.phase);
  const progress = useGenerationStore((state) => state.progress);
  const error = useGenerationStore((state) => state.error);
  const hasSource = useGenerationStore((state) => state.sourcePath !== null);
  const start = useGenerationStore((state) => state.start);
  const cancel = useGenerationStore((state) => state.cancel);

  if (phase === 'running') {
    return (
      <Card title="3 · Gerando">
        <div className="stack">
          <p>
            {progress
              ? `${STAGE_LABEL[progress.stage]} (${progress.done}/${progress.total})`
              : 'Preparando…'}
          </p>
          <ProgressBar value={overallProgress(progress)} label="Progresso da geração" />
          <Button variant="secondary" onClick={() => void cancel()}>
            Cancelar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="3 · Gerar">
      <div className="stack">
        {phase === 'failed' && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button block disabled={!hasSource} onClick={() => void start()}>
          Gerar variações
        </Button>
        {!hasSource && <p className="muted">Escolha um vídeo para começar.</p>}
      </div>
    </Card>
  );
}
