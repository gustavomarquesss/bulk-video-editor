import { pad } from '../format';
import type { Capture } from '../variation/types';

const toIsoSeconds = (date: Date): string => date.toISOString().replace(/\.\d+Z$/, 'Z');

/** Formato de data do iPhone: 2026-11-03T18:22:41-0300 (hora local com deslocamento). */
function toAppleDate(date: Date, offsetMinutes: number): string {
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes <= 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `${local.toISOString().replace(/\.\d+Z$/, '')}${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

/** Argumentos `-metadata` que imitam um arquivo gravado direto por um celular. */
export function buildMetadataArgs(capture: Capture): string[] {
  const { device, softwareVersion, recordedAt, timezoneOffsetMinutes } = capture;
  const args: string[] = [];
  const tag = (key: string, value: string) => args.push('-metadata', `${key}=${value}`);

  tag('creation_time', toIsoSeconds(recordedAt));
  if (device.platform === 'apple') {
    tag('com.apple.quicktime.make', device.make);
    tag('com.apple.quicktime.model', device.model);
    tag('com.apple.quicktime.software', softwareVersion);
    tag('com.apple.quicktime.creationdate', toAppleDate(recordedAt, timezoneOffsetMinutes));
    args.push('-metadata:s:v:0', 'handler_name=Core Media Video');
    args.push('-metadata:s:a:0', 'handler_name=Core Media Audio');
  } else {
    tag('com.android.version', softwareVersion);
    tag('com.android.manufacturer', device.make);
    tag('com.android.model', device.model);
    args.push('-metadata:s:v:0', 'handler_name=VideoHandle');
    args.push('-metadata:s:a:0', 'handler_name=SoundHandle');
  }
  return args;
}
