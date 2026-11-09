import { isSupportedVideoUrl } from './supported-video-url';

describe('isSupportedVideoUrl', () => {
    it.each([
        'https://www.tiktok.com/@chef/video/1',
        'https://vm.tiktok.com/abc',
        '  https://www.instagram.com/reel/abc/  ',
    ])('accepts %j', (url) => {
        expect(isSupportedVideoUrl(url)).toBe(true);
    });

    it.each(['', 'tiktok.com/@chef', 'https://www.youtube.com/watch?v=1', 'pas un lien'])(
        'refuses %j',
        (url) => {
            expect(isSupportedVideoUrl(url)).toBe(false);
        },
    );
});
