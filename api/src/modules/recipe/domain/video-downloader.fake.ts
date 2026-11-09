import { DownloadedVideo, VideoDownloaderPort } from './video-downloader.port';

export class FakeVideoDownloader implements VideoDownloaderPort {
    readonly requestedUrls: string[] = [];
    failure: Error | null = null;
    private gate: Promise<void> = Promise.resolve();
    private release: () => void = () => undefined;

    /** Downloads wait until `finish()` is called: lets a test subscribe while the job runs. */
    hold(): void {
        this.gate = new Promise((resolve) => {
            this.release = resolve;
        });
    }

    finish(): void {
        this.release();
    }

    async download(url: string): Promise<DownloadedVideo> {
        this.requestedUrls.push(url);
        await this.gate;
        if (this.failure) throw this.failure;
        return { buffer: Buffer.from('video'), mimeType: 'video/mp4', description: 'Recette' };
    }
}
