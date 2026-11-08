import { useState, type DragEvent } from 'react';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { getDesktopApi } from '@renderer/lib/desktop';
import { fileNameOf } from '@renderer/lib/format';
import { useGenerationStore } from '../useGenerationStore';

export function VideoPicker() {
  const sourcePath = useGenerationStore((state) => state.sourcePath);
  const running = useGenerationStore((state) => state.phase === 'running');
  const pickSource = useGenerationStore((state) => state.pickSource);
  const setSource = useGenerationStore((state) => state.setSource);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !running) setSource(getDesktopApi().pathForFile(file));
  };

  return (
    <Card title="1 · Vídeo original">
      <div
        className={`picker ${dragging ? 'picker--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {sourcePath ? (
          <>
            <p className="picker__name" title={sourcePath}>
              {fileNameOf(sourcePath)}
            </p>
            <Button variant="secondary" disabled={running} onClick={() => void pickSource()}>
              Trocar vídeo
            </Button>
          </>
        ) : (
          <>
            <p className="picker__prompt">Arraste um vídeo aqui</p>
            <p className="picker__hint">MP4, MOV, MKV ou WEBM · ideal de 4 a 15 segundos</p>
            <Button onClick={() => void pickSource()}>Escolher arquivo</Button>
          </>
        )}
      </div>
    </Card>
  );
}
