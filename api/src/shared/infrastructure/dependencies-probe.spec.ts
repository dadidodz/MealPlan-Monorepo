import { DependenciesProbe } from './dependencies-probe';

describe('DependenciesProbe', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.useFakeTimers();
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('reports every dependency ok when each host answers, whatever the status code', async () => {
        await expect(new DependenciesProbe().check()).resolves.toEqual({
            tiktok: 'ok',
            instagram: 'ok',
            gemini: 'ok',
        });
    });

    it('reports a dependency failing when its host cannot be reached', async () => {
        fetchMock.mockImplementation((input) =>
            input === 'https://generativelanguage.googleapis.com'
                ? Promise.reject(new TypeError('fetch failed'))
                : Promise.resolve(new Response(null)),
        );

        await expect(new DependenciesProbe().check()).resolves.toEqual({
            tiktok: 'ok',
            instagram: 'ok',
            gemini: 'failing',
        });
    });

    it('reuses the last result for a minute, then probes again', async () => {
        const probe = new DependenciesProbe();

        await probe.check();
        await probe.check();
        expect(fetchMock).toHaveBeenCalledTimes(3);

        vi.advanceTimersByTime(60_000);
        await probe.check();
        expect(fetchMock).toHaveBeenCalledTimes(6);
    });
});
