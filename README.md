# Bulk Video Editor

App desktop **local** (sem nuvem, sem custo) que recebe um vídeo e gera de 1 a 50 variações dele, cada uma com:

- **diferença controlada do original**: você escolhe "55% diferente" e o app calibra a intensidade de cada variação até chegar nesse valor;
- **enquadramento, cor e tempo diferentes**: recorte em âncoras distintas, "looks" (quente, frio, filme, vívido, fosco, sombrio…), vinheta, grão, velocidade e cortes sutis de início/fim;
- **voz mais grossa ou mais fina**: pitch e timbre ajustados com `rubberband` + EQ, sem mudar a duração;
- **metadados de celular** distintos (iPhone ou Android, versão do sistema, data de gravação);
- **variações diferentes entre si**: o app sorteia candidatas a mais e fica com as que, _medidas_, mais se afastam umas das outras.

## Como abrir

Dê dois cliques em **`iniciar.bat`**. Na primeira vez ele instala as dependências; depois compila e abre o app.

Ou pelo terminal:

```bash
npm install
npm run dev      # modo desenvolvimento (recarrega ao salvar)
npm run build && npm start   # versão compilada
```

### Requisitos

- Node.js 20 ou superior
- **ffmpeg "full"** no `PATH` (ou a variável `FFMPEG_DIR` apontando para a pasta dos executáveis). Precisa dos filtros `rubberband` e `colortemperature`. Em Windows: `winget install Gyan.FFmpeg`.
- Opcional: GPU NVIDIA. Com ela o app usa `h264_nvenc` automaticamente; sem ela, cai para `libx264`.

## Comandos

| Comando                    | O que faz                                            |
| -------------------------- | ---------------------------------------------------- |
| `npm run dev`              | abre o app em desenvolvimento                        |
| `npm run check`            | tipos + lint + testes                                |
| `npm test`                 | testes unitários (Vitest)                            |
| `npm run generate -- <v>`  | gera variações sem interface (mesmo serviço do app)  |
| `npm run report:diversity` | compara estratégias de sorteio medindo em vídeo real |

## Arquitetura

```
src/
  core/        Domínio puro (sem Electron, Node nem React; o ESLint impede essas importações)
    variation/   sorteio, looks, intensidade → parâmetros concretos
    diff/        métricas de imagem/áudio, score de diferença, calibração, separação
    ffmpeg/      construtores de filtros e metadados (funções puras que montam strings)
    selection.ts seleção "farthest-point" (maximiza a menor distância entre escolhidas)
  main/        Processo principal do Electron
    infrastructure/  ffmpeg (cliente, probe, medidor, renderizador), processos, patch de MP4
    services/        GenerationService: orquestra planejamento → calibração → render
    ipc/             handlers com validação (Zod) na fronteira
  preload/     Ponte segura (contextBridge) → `window.desktop`
  renderer/    Interface React, organizada por funcionalidade
  shared/      Contrato entre processos (tipos, schemas Zod, canais IPC)
poc/           Protótipos descartáveis da fase de validação (JavaScript)
```

Decisões de projeto:

- **Injeção de dependências**: o ffmpeg fica atrás de `ProcessRunner`/`FfmpegClient`; o store da interface recebe a `DesktopApi`. Tudo é testável sem ffmpeg nem Electron.
- **Sorteio em duas etapas**: `VariationDraw` (o que foi sorteado) e `VariationParams` (valores concretos = sorteio × intensidade). Com o sorteio fixo, o score cresce com a intensidade e a busca binária converge.
- **Segurança**: `contextIsolation`, `sandbox`, CSP, navegação bloqueada e `openFolder` restrito à pasta de saída.

## Como o score de diferença funciona

`score = 100 · (0,60·visual + 0,15·tempo + 0,25·áudio)`

- **visual**: medido em 8 frames amostrados (SSIM em escala grossa, dHash e histograma de cor). O espelhamento não conta, porque fingerprints costumam ser robustos a flip.
- **tempo** e **áudio**: declarados pelos parâmetros (velocidade e cortes; semitons de pitch e ganho de EQ).

É uma **estimativa de engenharia**, não uma garantia: as constantes de saturação foram calibradas com vídeo real, mas o efeito sobre a detecção de duplicidade de cada plataforma só se confirma publicando.

## Resultados medidos (vídeo real de 11 s, RTX 3060)

| Cenário                                    | Resultado                                      |
| ------------------------------------------ | ---------------------------------------------- |
| Precisão da calibração (alvos de 10 a 70)  | ±1,5 ponto de score                            |
| 12 variações, alvo 55, diversidade 70%     | ~20 s no total (GPU)                           |
| Par mais parecido entre variações, alvo 40 | ~0,06 (sorteio livre) → ~0,21 (seleção medida) |
| Par mais parecido entre variações, alvo 60 | ~0,13 → ~0,51                                  |

## Limitações conhecidas

- O Instagram recodifica o upload e descarta boa parte dos metadados do contêiner; eles têm efeito limitado.
- Os metadados imitam as tags de um celular, mas não toda a estrutura de um arquivo gravado por ele (por exemplo, iPhones gravam em HEVC).
- O espelhamento inverte textos e legendas que estejam no vídeo.
