import { spawn } from 'node:child_process';

export interface RunOptions {
  /** Bytes enviados para o stdin do processo. */
  readonly input?: Uint8Array;
  /** Cancela o processo (ele é encerrado e a promessa rejeita). */
  readonly signal?: AbortSignal;
}

/** Porta para executar processos externos; permite testar o código sem ffmpeg instalado. */
export interface ProcessRunner {
  /** Executa e devolve o stdout. Rejeita com `ProcessError` se o código de saída não for 0. */
  run(command: string, args: readonly string[], options?: RunOptions): Promise<Buffer>;
}

export class ProcessError extends Error {
  constructor(
    readonly command: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(`${command} terminou com código ${String(exitCode)}: ${stderr.trim()}`);
    this.name = 'ProcessError';
  }
}

export class NodeProcessRunner implements ProcessRunner {
  run(command: string, args: readonly string[], options: RunOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [...args], { windowsHide: true, signal: options.signal });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.stdin.on('error', () => undefined); // EPIPE quando o processo termina antes de ler tudo
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(Buffer.concat(stdout));
        else reject(new ProcessError(command, code, Buffer.concat(stderr).toString('utf8')));
      });

      child.stdin.end(options.input);
    });
  }
}
