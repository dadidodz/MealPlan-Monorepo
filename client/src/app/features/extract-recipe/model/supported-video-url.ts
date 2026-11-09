/** True for a TikTok or Instagram link: the only sites the API's video download accepts. */
export function isSupportedVideoUrl(value: string): boolean {
    try {
        const host = new URL(value.trim()).hostname.toLowerCase();
        return host.includes('instagram.com') || host.includes('tiktok.com');
    } catch {
        return false;
    }
}
