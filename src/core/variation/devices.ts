import type { DeviceProfile } from './types';

export const DEVICE_PROFILES: readonly DeviceProfile[] = [
  {
    make: 'Apple',
    model: 'iPhone 13',
    platform: 'apple',
    softwareVersions: ['16.7.8', '17.5.1', '17.6.1'],
  },
  {
    make: 'Apple',
    model: 'iPhone 14 Pro',
    platform: 'apple',
    softwareVersions: ['17.4.1', '17.6.1', '18.0.1'],
  },
  {
    make: 'Apple',
    model: 'iPhone 15',
    platform: 'apple',
    softwareVersions: ['17.5.1', '18.0', '18.1'],
  },
  {
    make: 'Apple',
    model: 'iPhone 15 Pro Max',
    platform: 'apple',
    softwareVersions: ['17.6.1', '18.1', '18.2'],
  },
  {
    make: 'Apple',
    model: 'iPhone 16',
    platform: 'apple',
    softwareVersions: ['18.1', '18.2', '18.3'],
  },
  { make: 'samsung', model: 'SM-S918B', platform: 'android', softwareVersions: ['14'] }, // S23 Ultra
  { make: 'samsung', model: 'SM-S921B', platform: 'android', softwareVersions: ['14', '15'] }, // S24
  { make: 'Google', model: 'Pixel 8', platform: 'android', softwareVersions: ['14', '15'] },
  { make: 'Xiaomi', model: '2312DRA50G', platform: 'android', softwareVersions: ['14'] },
];
