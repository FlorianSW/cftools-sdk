import {InMemoryCache} from './in-memory-cache';
import {Cache} from '../types';

describe('InMemoryCache', () => {
    const someValue = {some: 'value'};
    const anotherValue = {another: 'value'};

    let cache: Cache;

    beforeEach(() => {
        cache = new InMemoryCache();
    });

    it('has undefined value for non-existing key', () => {
        expect(cache.get('SOME_KEY')).toBeUndefined();
    });

    it('caches value', () => {
        cache.set('SOME_KEY', someValue);

        expect(cache.get('SOME_KEY')).toEqual(someValue);
    });

    it('overrides already cached value', () => {
        cache.set('SOME_KEY', someValue);

        cache.set('SOME_KEY', anotherValue);

        expect(cache.get('SOME_KEY')).toEqual(anotherValue);
    });

    it('expired value returns undefined', () => {
        cache.set('SOME_KEY', someValue, -60);

        expect(cache.get('SOME_KEY')).toBeUndefined();
    });
});
