import { describe, expect, it } from 'vitest';
import type { Capture } from '../variation/types';
import { buildMetadataArgs } from './metadata';

const recordedAt = new Date('2026-11-04T21:03:15.789Z');

const apple: Capture = {
  device: { make: 'Apple', model: 'iPhone 16', platform: 'apple', softwareVersions: ['18.2'] },
  softwareVersion: '18.2',
  recordedAt,
  timezoneOffsetMinutes: -180,
};

const android: Capture = {
  device: { make: 'Google', model: 'Pixel 8', platform: 'android', softwareVersions: ['15'] },
  softwareVersion: '15',
  recordedAt,
  timezoneOffsetMinutes: -180,
};

const pairs = (args: string[]) => args.filter((_, i) => i % 2 === 1);

describe('buildMetadataArgs', () => {
  it('escreve as chaves QuickTime do iPhone', () => {
    const values = pairs(buildMetadataArgs(apple));
    expect(values).toContain('creation_time=2026-11-04T21:03:15Z');
    expect(values).toContain('com.apple.quicktime.make=Apple');
    expect(values).toContain('com.apple.quicktime.model=iPhone 16');
    expect(values).toContain('com.apple.quicktime.software=18.2');
  });

  it('usa a hora local com deslocamento no creationdate do iPhone', () => {
    expect(pairs(buildMetadataArgs(apple))).toContain(
      'com.apple.quicktime.creationdate=2026-11-04T18:03:15-0300',
    );
  });

  it('usa os handlers de cada plataforma', () => {
    expect(buildMetadataArgs(apple).join(' ')).toContain('Core Media Video');
    expect(buildMetadataArgs(android).join(' ')).toContain('VideoHandle');
  });

  it('escreve as chaves do Android', () => {
    const values = pairs(buildMetadataArgs(android));
    expect(values).toContain('com.android.model=Pixel 8');
    expect(values).toContain('com.android.manufacturer=Google');
  });
});
