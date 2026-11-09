import { MessageEvent } from '@nestjs/common';
import { defaultIfEmpty, interval, map, merge, Observable, shareReplay, takeUntil } from 'rxjs';

/** Well under nginx's default 60 s `proxy_read_timeout`. */
export const HEARTBEAT_MS = 20_000;

/** No `data`: browsers' EventSource doesn't dispatch it, but the bytes keep proxies from closing the connection. */
const PING: MessageEvent = { type: 'ping', data: '' };

/**
 * Sends each value as an SSE message, plus a `ping` event every HEARTBEAT_MS until the first value
 * (or the end of the stream), so a long silent job doesn't get its connection dropped.
 */
export function withHeartbeat<T extends object>(values$: Observable<T>): Observable<MessageEvent> {
    // Replayed: the ping timer subscribes second and must still see a value emitted at once (cached result)
    const shared$ = values$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
    return merge(
        shared$.pipe(map((data): MessageEvent => ({ data }))),
        interval(HEARTBEAT_MS).pipe(
            map(() => PING),
            takeUntil(shared$.pipe(defaultIfEmpty(null))),
        ),
    );
}
