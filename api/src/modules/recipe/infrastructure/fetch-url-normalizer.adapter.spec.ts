import { Logger } from '@nestjs/common';
import { FetchUrlNormalizer } from './fetch-url-normalizer.adapter';

describe('FetchUrlNormalizer', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('drops the query string of a full link, without any request', async () => {
        expect(
            await new FetchUrlNormalizer().normalize(
                'https://www.tiktok.com/@chef/video/1?is_from_webapp=1',
            ),
        ).toBe('https://www.tiktok.com/@chef/video/1');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('follows a short link to its full URL, without the query string', async () => {
        const followed = new Response(null);
        Object.defineProperty(followed, 'url', {
            value: 'https://www.tiktok.com/@chef/video/1?_r=1',
        });
        fetchMock.mockResolvedValueOnce(followed);

        expect(await new FetchUrlNormalizer().normalize('https://vm.tiktok.com/ZMabc/')).toBe(
            'https://www.tiktok.com/@chef/video/1',
        );
        expect(fetchMock).toHaveBeenCalledWith(
            'https://vm.tiktok.com/ZMabc/',
            expect.objectContaining({ method: 'HEAD' }),
        );
    });

    it('falls back to the short link without its query string when the request fails', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

        expect(await new FetchUrlNormalizer().normalize('https://vm.tiktok.com/ZMabc/?x=1')).toBe(
            'https://vm.tiktok.com/ZMabc/',
        );
    });

    it('makes no request for a link that only mentions a short-link host', async () => {
        expect(
            await new FetchUrlNormalizer().normalize('http://192.168.1.10:8080/vm.tiktok.com?x=1'),
        ).toBe('http://192.168.1.10:8080/vm.tiktok.com');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
