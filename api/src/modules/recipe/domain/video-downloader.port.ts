export const VIDEO_DOWNLOADER = Symbol('VideoDownloader');

export interface DownloadedVideo {
    buffer: Buffer;
    mimeType: string;
    description?: string;
}

export interface VideoDownloaderPort {
    /**
     * Downloads a video from a URL (TikTok, Instagram, etc.)
     * @param url The video URL
     * @returns The downloaded video, in memory
     * @throws VideoDownloadFailedError if the download fails or the URL is invalid
     */
    download(url: string): Promise<DownloadedVideo>;
}
