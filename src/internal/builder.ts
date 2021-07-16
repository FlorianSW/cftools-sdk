import {Cache, CacheConfiguration, CFToolsClient, LoginCredentials, ServerApiId} from '../types';
import {InMemoryCache} from './in-memory-cache';
import {GotCFToolsClient} from './got/client';
import {CachingCFToolsClient} from './caching-cftools-client';
import {GotHttpClient} from './http';

export class CFToolsClientBuilder {
    private serverApiId: ServerApiId | undefined;
    private credentials: LoginCredentials | undefined;
    private cache: Cache | undefined;
    private cacheConfig: CacheConfiguration = {
        leaderboard: 30,
        serverInfo: 30,
        gameServerDetails: 10,
        playerDetails: 10,
        priorityQueue: 20,
        whitelist: 20,
        banlist: 10,
    };

    /**
     * Set the default server api ID identifying the CFTools Cloud server instance.
     * This default API ID is not required. Methods will allow to override this default id, otherwise this ID
     * needs to be set in order for the method to succeed.
     *
     * Methods that require authentication are marked in their documentation, that they require an authenticated client.
     */
    public withServerApiId(serverApiId: string): CFToolsClientBuilder {
        this.serverApiId = ServerApiId.of(serverApiId);
        return this;
    }

    /**
     * Sets the API credentials used to authenticate against endpoints that require authentication.
     * Not every endpoint of the CFTools Cloud API requires authentication. Where not needed, the SDK will make
     * unauthenticated requests. Whenever an endpoint requires authentication, these credentials must be set in order
     * for the method to succeed.
     */
    public withCredentials(applicationId: string, secret: string): CFToolsClientBuilder {
        this.credentials = LoginCredentials.of(applicationId, secret);
        return this;
    }

    public withCache(cache?: Cache): CFToolsClientBuilder {
        this.cache = cache || new InMemoryCache();
        return this;
    }

    /**
     * Specify the configuration of the cached CFTools client. Configuring this makes only sense when
     * the client is configured to use a cache, otherwise this configuration is ignored.
     *
     * You do not need to configure all of the CacheConfiguration options. Omitted options will be auto-
     * completed with the default settings.
     */
    public withCacheConfiguration(config: Partial<CacheConfiguration>): CFToolsClientBuilder {
        this.cacheConfig = {
            ...this.cacheConfig,
            ...config,
        };
        return this;
    }

    public build(): CFToolsClient {
        const client = new GotCFToolsClient(new GotHttpClient(), this.serverApiId, this.credentials);
        if (this.cache !== undefined) {
            return new CachingCFToolsClient(this.cache, this.cacheConfig, client, this.serverApiId);
        }
        return client;
    }
}
