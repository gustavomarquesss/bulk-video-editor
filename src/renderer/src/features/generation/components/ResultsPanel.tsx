import type { GenerationResult, VariantSummary } from '@shared/generation';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { Chip } from '@renderer/components/ui/Chip';
import {
  formatDuration,
  formatPercent,
  formatRatioAsPercent,
  formatSpeed,
} from '@renderer/lib/format';
import { LOOK_LABEL } from '../presentation';
import { useGenerationStore } from '../useGenerationStore';

function Summary({ result }: { result: GenerationResult }) {
  const items = [
    { label: 'Variações', value: String(result.variants.length) },
    { label: 'Tempo', value: formatDuration(result.elapsedSeconds) },
    { label: 'Encoder', value: result.encoder === 'nvenc' ? 'GPU (NVENC)' : 'CPU (x264)' },
    { label: 'Par mais parecido', value: formatRatioAsPercent(result.separation.min) },
    { label: 'Diferença média entre elas', value: formatRatioAsPercent(result.separation.mean) },
  ];
  return (
    <dl className="summary">
      {items.map(({ label, value }) => (
        <div key={label} className="summary__item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function VariantRow({ variant }: { variant: VariantSummary }) {
  return (
    <tr>
      <td className="num">{variant.index}</td>
      <td title={variant.fileName}>{variant.fileName}</td>
      <td className="num">
        {formatPercent(variant.score)}
        {!variant.reachable && <Chip tone="warning">abaixo do alvo</Chip>}
      </td>
      <td>
        <Chip>{LOOK_LABEL[variant.look] ?? variant.look}</Chip>
      </td>
      <td>{variant.voice === 'thicker' ? 'Mais grossa' : 'Mais fina'}</td>
      <td className="num">{formatSpeed(variant.speed)}</td>
      <td>{variant.mirror ? 'Sim' : '—'}</td>
      <td>{variant.device}</td>
    </tr>
  );
}

export function ResultsPanel() {
  const result = useGenerationStore((state) => state.result);
  const openOutputFolder = useGenerationStore((state) => state.openOutputFolder);
  if (!result) return null;

  return (
    <Card
      title="Resultado"
      aside={
        <Button variant="secondary" onClick={() => void openOutputFolder()}>
          Abrir pasta
        </Button>
      }
    >
      <div className="stack">
        <Summary result={result} />
        <p className="muted">{result.outputDir}</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Arquivo</th>
                <th>Diferença</th>
                <th>Look</th>
                <th>Voz</th>
                <th>Velocidade</th>
                <th>Espelhado</th>
                <th>Aparelho</th>
              </tr>
            </thead>
            <tbody>
              {result.variants.map((variant) => (
                <VariantRow key={variant.index} variant={variant} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
