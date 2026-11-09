/** The link without its query string: tracking parameters (`?is_from_webapp=1`) don't make another video. */
export function withoutQueryString(url: string): string {
    return url.split('?')[0];
}
