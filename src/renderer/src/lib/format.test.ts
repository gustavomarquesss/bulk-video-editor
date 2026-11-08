import { describe, expect, it } from 'vitest';
import {
  fileNameOf,
  formatDuration,
  formatPercent,
  formatRatioAsPercent,
  formatSpeed,
} from './format';

describe('format', () => {
  it('formata porcentagens', () => {
    expect(formatPercent(41.6)).toBe('42%');
    expect(formatRatioAsPercent(0.213)).toBe('21%');
  });

  it('formata durações em segundos e minutos', () => {
    expect(formatDuration(31.4)).toBe('31s');
    expect(formatDuration(125)).toBe('2min 5s');
  });

  it('extrai o nome do arquivo de caminhos Windows e Unix', () => {
    expect(fileNameOf('C:\\Videos\\meu video.mp4')).toBe('meu video.mp4');
    expect(fileNameOf('/home/user/clip.mov')).toBe('clip.mov');
  });

  it('formata a variação de velocidade com sinal', () => {
    expect(formatSpeed(1.034)).toBe('+3%');
    expect(formatSpeed(0.96)).toBe('-4%');
    expect(formatSpeed(1)).toBe('0%');
  });
});
