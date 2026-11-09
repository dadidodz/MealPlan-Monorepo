import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DownloadedVideo, VideoDownloaderPort } from '../domain/video-downloader.port';
import { Injectable, Logger } from '@nestjs/common';
import { VideoDownloadFailedError } from '../domain/video-download-failed.error';

// Separate video and audio streams are merged by ffmpeg, so voice-overs reach Gemini
const FORMAT = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
// No generic extractor: a URL that isn't TikTok or Instagram never makes yt-dlp request its host
const EXTRACTORS = String.raw`tiktok.*,vm\.tiktok,instagram.*`;
// Printed only once the file is downloaded and merged: no output means nothing was downloaded (e.g. over the size limit)
const PRINTED_FIELDS = 'after_move:%(.{filepath,description})j';
// yt-dlp gets no secret (DATABASE_URL, GEMINI_API_KEY). SYSTEMROOT and TEMP/TMP are for Windows (dev): Python's
// networking needs SYSTEMROOT, the standalone binary unpacks itself into TEMP.
const INHERITED_ENV = ['PATH', 'SYSTEMROOT', 'TEMP', 'TMP'];

/** Unset or blank → the default; anything but a positive integer stops the API at startup. */
function positiveIntegerFromEnv(name: string, fallback: number): number {
    const raw = process.env[name]?.trim();
    if (raw === undefined || raw === '') {
        return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer, got "${raw}"`);
    }
    return value;
}

function minimalEnv(): NodeJS.ProcessEnv {
    return Object.fromEntries(
        INHERITED_ENV.flatMap((name) => {
            const value = process.env[name];
            return value === undefined ? [] : [[name, value]];
        }),
    );
}

function runYtDlp(args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        // From the PATH so dev (winget) and the image share the code. In the image every PATH folder belongs to
        // root and the API runs as `node`: it can't plant another yt-dlp there.
        // eslint-disable-next-line sonarjs/no-os-command-from-path
        execFile('yt-dlp', args, { env: minimalEnv(), timeout: timeoutMs }, (error, stdout) => {
            if (error) {
                reject(error.killed ? new Error(`timed out after ${timeoutMs} ms`) : error);
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * yt-dlp's printed JSON, narrowed: the path of the downloaded file and the post's description, if any. One line per
 * downloaded file: only the first is read (a carousel is a playlist, `--playlist-items 1` keeps one anyway).
 */
function parsePrinted(stdout: string): { filepath: string; description?: string } {
    const firstLine = stdout.split('\n').find((line) => line.trim() !== '');
    if (firstLine === undefined) {
        throw new Error('nothing downloaded (over the size limit?)');
    }
    const printed: unknown = JSON.parse(firstLine);
    if (
        typeof printed !== 'object' ||
        printed === null ||
        !('filepath' in printed) ||
        typeof printed.filepath !== 'string'
    ) {
        throw new Error('no file path in yt-dlp output');
    }
    const description =
        'description' in printed &&
        typeof printed.description === 'string' &&
        printed.description !== ''
            ? printed.description
            : undefined;
    return { filepath: printed.filepath, description };
}

@Injectable()
export class YtDlpVideoDownloader implements VideoDownloaderPort {
    private readonly logger = new Logger(YtDlpVideoDownloader.name);

    private readonly timeoutMs = positiveIntegerFromEnv('DOWNLOAD_TIMEOUT_MS', 120_000);

    private readonly maxFileSizeMb = positiveIntegerFromEnv('MAX_FILE_SIZE_MB', 100);

    async download(url: string): Promise<DownloadedVideo> {
        this.logger.log(`Downloading the video with yt-dlp: ${url}`);
        const folder = await mkdtemp(join(tmpdir(), 'mealplan-yt-dlp-'));

        try {
            const stdout = await runYtDlp(
                [
                    '--use-extractors',
                    EXTRACTORS,
                    '--no-playlist',
                    '--playlist-items',
                    '1',
                    '--format',
                    FORMAT,
                    '--merge-output-format',
                    'mp4',
                    '--max-filesize',
                    `${this.maxFileSizeMb}M`,
                    '--output',
                    join(folder, 'video.%(ext)s'),
                    '--print',
                    PRINTED_FIELDS,
                    '--',
                    url,
                ],
                this.timeoutMs,
            );
            const { filepath, description } = parsePrinted(stdout);
            const buffer = await readFile(filepath);

            this.logger.log(`Video downloaded (${(buffer.length / 1024 / 1024).toFixed(2)} MB).`);

            return { buffer, mimeType: 'video/mp4', description };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // The cause (yt-dlp's error, timeout, size) stays in the log: the client only gets the code
            this.logger.error(`Download failed: ${errorMessage}`);
            throw new VideoDownloadFailedError();
        } finally {
            // A failed cleanup is only logged: it must not replace the video or the download error
            await rm(folder, { recursive: true, force: true }).catch((cleanupError: unknown) =>
                this.logger.warn(`Could not delete the download folder ${folder}`, cleanupError),
            );
        }
    }
}
