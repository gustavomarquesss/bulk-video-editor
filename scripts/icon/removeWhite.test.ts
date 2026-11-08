import { describe, expect, it } from 'vitest';
import { removeWhite } from './removeWhite';

const pixel = (r: number, g: number, b: number, a = 255): Uint8Array =>
  Uint8Array.from([r, g, b, a]);

describe('removeWhite', () => {
  it('torna branco puro e quase-branco (ruído de JPEG) totalmente transparentes', () => {
    expect(removeWhite(pixel(255, 255, 255))[3]).toBe(0);
    expect(removeWhite(pixel(252, 253, 251))[3]).toBe(0);
  });

  it('mantém cores saturadas opacas e inalteradas', () => {
    expect([...removeWhite(pixel(220, 30, 60))]).toEqual([220, 30, 60, 255]);
    expect([...removeWhite(pixel(250, 140, 50))]).toEqual([250, 140, 50, 255]);
  });

  it('remove o branco de qualquer lugar, inclusive "dentro" do desenho', () => {
    // vermelho | branco | vermelho: o branco do meio está cercado pelo desenho
    const image = Uint8Array.from([
      ...pixel(220, 30, 60),
      ...pixel(255, 255, 255),
      ...pixel(220, 30, 60),
    ]);
    const alphas = removeWhite(image).filter((_, i) => i % 4 === 3);
    expect([...alphas]).toEqual([255, 0, 255]);
  });

  it('desmistura bordas: 50% de vermelho sobre branco volta a ser vermelho semitransparente', () => {
    const blended = pixel(
      Math.round((220 + 255) / 2),
      Math.round((30 + 255) / 2),
      Math.round((60 + 255) / 2),
    );
    const [r, g, b, a] = removeWhite(blended);
    expect(a).toBeGreaterThan(80);
    expect(a).toBeLessThan(200);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(110);
  });

  it('não altera a entrada', () => {
    const original = pixel(200, 200, 200);
    const copy = Uint8Array.from(original);
    removeWhite(original);
    expect(original).toEqual(copy);
  });

  it('é monotônica: quanto mais claro o cinza, menos opaco', () => {
    const alphaOf = (gray: number) => removeWhite(pixel(gray, gray, gray))[3];
    expect(alphaOf(80)).toBeGreaterThanOrEqual(alphaOf(150));
    expect(alphaOf(150)).toBeGreaterThanOrEqual(alphaOf(220));
  });
});
