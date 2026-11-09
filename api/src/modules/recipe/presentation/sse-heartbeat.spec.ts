import { MessageEvent } from '@nestjs/common';
import { of, Subject } from 'rxjs';
import { HEARTBEAT_MS, withHeartbeat } from './sse-heartbeat';

describe('withHeartbeat', () => {
    const result = { status: 'success' };
    let events: MessageEvent[];
    let completed: boolean;

    const listen = (values$: Parameters<typeof withHeartbeat>[0]): void => {
        withHeartbeat(values$).subscribe({
            next: (event) => events.push(event),
            complete: () => (completed = true),
        });
    };

    beforeEach(() => {
        vi.useFakeTimers();
        events = [];
        completed = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('pings every interval while the job runs', () => {
        listen(new Subject<object>());

        vi.advanceTimersByTime(HEARTBEAT_MS * 2 + 1);

        expect(events).toEqual([
            { type: 'ping', data: '' },
            { type: 'ping', data: '' },
        ]);
        expect(completed).toBe(false);
    });

    it('sends the result, then stops pinging and completes', () => {
        const job = new Subject<object>();
        listen(job);
        vi.advanceTimersByTime(HEARTBEAT_MS);

        job.next(result);
        job.complete();
        vi.advanceTimersByTime(HEARTBEAT_MS * 3);

        expect(events).toEqual([{ type: 'ping', data: '' }, { data: result }]);
        expect(completed).toBe(true);
    });

    it('sends a result available at once without any ping', () => {
        listen(of(result));
        vi.advanceTimersByTime(HEARTBEAT_MS * 3);

        expect(events).toEqual([{ data: result }]);
        expect(completed).toBe(true);
    });
});
