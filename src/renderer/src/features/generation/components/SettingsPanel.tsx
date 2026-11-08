import { MAX_VARIATIONS } from '@shared/limits';
import { Card } from '@renderer/components/ui/Card';
import { Slider } from '@renderer/components/ui/Slider';
import { Toggle } from '@renderer/components/ui/Toggle';
import { formatPercent } from '@renderer/lib/format';
import { describeDifference, describeDiversity } from '../presentation';
import { useGenerationStore } from '../useGenerationStore';

export function SettingsPanel() {
  const settings = useGenerationStore((state) => state.settings);
  const disabled = useGenerationStore((state) => state.phase === 'running');
  const updateSettings = useGenerationStore((state) => state.updateSettings);

  return (
    <Card title="2 · Ajustes">
      <div className="stack">
        <Slider
          label="Quantidade de variações"
          valueLabel={String(settings.count)}
          min={1}
          max={MAX_VARIATIONS}
          value={settings.count}
          disabled={disabled}
          hint="Quantos vídeos novos gerar"
          onChange={(count) => updateSettings({ count })}
        />
        <Slider
          label="Diferença do original"
          valueLabel={formatPercent(settings.targetDifference)}
          min={5}
          max={100}
          value={settings.targetDifference}
          disabled={disabled}
          hint={describeDifference(settings.targetDifference)}
          onChange={(targetDifference) => updateSettings({ targetDifference })}
        />
        <Slider
          label="Diversidade entre variações"
          valueLabel={formatPercent(settings.diversity * 100)}
          min={0}
          max={100}
          value={Math.round(settings.diversity * 100)}
          disabled={disabled}
          hint={describeDiversity(settings.diversity)}
          onChange={(percent) => updateSettings({ diversity: percent / 100 })}
        />
        <Toggle
          label="Espelhar algumas variações"
          hint="inverte a imagem horizontalmente (textos ficam espelhados)"
          checked={settings.allowMirror}
          disabled={disabled}
          onChange={(allowMirror) => updateSettings({ allowMirror })}
        />
      </div>
    </Card>
  );
}
