import type { ExecFileException, ExecFileOptions } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { MockInstance } from 'vitest';
import { Logger } from '@nestjs/common';
import { YtDlpVideoDownloader } from './yt-dlp-video-downloader.adapter';
import { VideoDownloadFailedError } from '../domain/video-download-failed.error';

type Done = (error: ExecFileException | null, stdout: string, stderr: string) => void;

const execFileMock = vi.hoisted(() =>
    vi.fn<(file: string, args: string[], options: ExecFileOptions, done: Done) => void>(),
);
vi.mock('node:child_process', () => ({ execFile: execFileMock }));

const URL = 'https://www.tiktok.com/@chef/video/123';

/** The value following `flag` in yt-dlp's arguments, '' when the flag is missing. */
function argAfter(args: string[], flag: string): string {
    const index = args.indexOf(flag);
    return index === -1 ? '' : (args[index + 1] ?? '');
}

/** yt-dlp downloads the video, then prints its path and the given fields (nothing for `null`). */
function ytDlpDownloads(printed: { description?: string } | null): void {
    execFileMock.mockImplementation((_file, args, _options, done) => {
        const filepath = argAfter(args, '--output').replace('%(ext)s', 'mp4');
        writeFileSync(filepath, 'video');
        done(null, printed === null ? '' : JSON.stringify({ filepath, ...printed }), '');
    });
}

function ytDlpFails(error: ExecFileException): void {
    execFileMock.mockImplementation((_file, _args, _options, done) => done(error, '', ''));
}

function lastRun(): { args: string[]; options: ExecFileOptions; folder: string } {
    const [, args, options] = execFileMock.mock.lastCall ?? ['', [], {}];
    return { args, options, folder: dirname(argAfter(args, '--output')) };
}

describe('YtDlpVideoDownloader', () => {
    let logError: MockInstance<Logger['error']>;

    beforeEach(() => {
        execFileMock.mockReset();
        logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        logError.mockRestore();
    });

    it('returns the downloaded mp4 and its description, then deletes its temporary folder', async () => {
        ytDlpDownloads({ description: 'Poulet au miel #recette' });

        const video = await new YtDlpVideoDownloader().download(URL);

        expect(video).toEqual({
            buffer: Buffer.from('video'),
            mimeType: 'video/mp4',
            description: 'Poulet au miel #recette',
        });
        expect(existsSync(lastRun().folder)).toBe(false);
    });

    it('leaves the description out when the post has none', async () => {
        ytDlpDownloads({ description: '' });

        const video = await new YtDlpVideoDownloader().download(URL);

        expect(video.description).toBeUndefined();
    });

    it('turns the generic extractor off and passes the URL after "--"', async () => {
        ytDlpDownloads({});

        await new YtDlpVideoDownloader().download(URL);

        const { args } = lastRun();
        expect(argAfter(args, '--use-extractors')).toBe(
            String.raw`tiktok.*,vm\.tiktok,instagram.*`,
        );
        expect(args.slice(-2)).toEqual(['--', URL]);
    });

    it('keeps only the first media of a post with several (a carousel)', async () => {
        execFileMock.mockImplementation((_file, args, _options, done) => {
            const filepath = argAfter(args, '--output').replace('%(ext)s', 'mp4');
            writeFileSync(filepath, 'first video');
            const second = JSON.stringify({ filepath: `${filepath}.2`, description: 'second' });
            done(null, `${JSON.stringify({ filepath, description: 'first' })}\n${second}\n`, '');
        });

        const video = await new YtDlpVideoDownloader().download(URL);

        expect(argAfter(lastRun().args, '--playlist-items')).toBe('1');
        expect(video).toMatchObject({ buffer: Buffer.from('first video'), description: 'first' });
    });

    it('gives yt-dlp no secret from the API environment', async () => {
        vi.stubEnv('DATABASE_URL', 'postgresql://user:secret@db/mealplan');
        vi.stubEnv('GEMINI_API_KEY', 'secret-key');
        ytDlpDownloads({});

        await new YtDlpVideoDownloader().download(URL);

        expect(lastRun().options.env).not.toHaveProperty('DATABASE_URL');
        expect(lastRun().options.env).not.toHaveProperty('GEMINI_API_KEY');
        expect(lastRun().options.env).toHaveProperty('PATH', process.env.PATH);
    });

    it('uses a 120 s timeout and a 100 MB limit by default', async () => {
        ytDlpDownloads({});

        await new YtDlpVideoDownloader().download(URL);

        expect(lastRun().options.timeout).toBe(120_000);
        expect(argAfter(lastRun().args, '--max-filesize')).toBe('100M');
    });

    it('reads the timeout and the size limit from the environment', async () => {
        vi.stubEnv('DOWNLOAD_TIMEOUT_MS', '5000');
        vi.stubEnv('MAX_FILE_SIZE_MB', ' 10 ');
        ytDlpDownloads({});

        await new YtDlpVideoDownloader().download(URL);

        expect(lastRun().options.timeout).toBe(5000);
        expect(argAfter(lastRun().args, '--max-filesize')).toBe('10M');
    });

    it.each(['0', '-1', '1.5', 'abc'])('refuses to start with MAX_FILE_SIZE_MB=%s', (value) => {
        vi.stubEnv('MAX_FILE_SIZE_MB', value);

        expect(() => new YtDlpVideoDownloader()).toThrow(
            'MAX_FILE_SIZE_MB must be a positive integer',
        );
    });

    it.each([
        [
            'yt-dlp fails',
            Object.assign(new Error('ERROR: Unsupported URL'), { killed: false }),
            'Unsupported URL',
        ],
        [
            'the timeout kills yt-dlp',
            Object.assign(new Error('Command failed'), { killed: true }),
            'timed out',
        ],
    ])('logs why and rejects with a VideoDownloadFailedError when %s', async (_, error, cause) => {
        ytDlpFails(error);

        await expect(new YtDlpVideoDownloader().download(URL)).rejects.toThrow(
            VideoDownloadFailedError,
        );

        expect(logError).toHaveBeenCalledWith(expect.stringContaining(cause));
        expect(existsSync(lastRun().folder)).toBe(false);
    });

    it('rejects when yt-dlp downloaded nothing (file over the size limit)', async () => {
        ytDlpDownloads(null);

        await expect(new YtDlpVideoDownloader().download(URL)).rejects.toThrow(
            VideoDownloadFailedError,
        );

        expect(logError).toHaveBeenCalledWith(expect.stringContaining('nothing downloaded'));
    });
});
