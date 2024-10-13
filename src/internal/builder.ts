import {AuthorizationProvider, Cache, CacheConfiguration, CFToolsClient, LoginCredentials, ServerApiId} from '../types';
import {InMemoryCache} from './in-memory-cache';
import {GotCFToolsClient} from './got/client';
import {CachingCFToolsClient} from './caching-cftools-client';
import {GotHttpClient, httpClient, HttpClient} from './http';
import {CFToolsAuthorizationProvider, EnterpriseAuthorizationProvider, NoOpAuthorizationProvider} from './auth';

export type HttpClientBuilder = (auth?: AuthorizationProvider) => HttpClient;

export class CFToolsClientBuilder {
    private serverApiId: ServerApiId | undefined;
    private enterpriseToken: string | undefined;
    private hasAccountCreationAccess: boolean | undefined;
    private credentials: LoginCredentials | undefined;
    private cache: Cache | undefined;
    private cacheConfig: CacheConfiguration = {
        appGrants: 60,
        leaderboard: 30,
        serverInfo: 30,
        gameSessions: 10,
        gameServerDetails: 10,
        playerDetails: 10,
        priorityQueue: 20,
        whitelist: 20,
        banlist: 10,
        resolve: Number.MAX_SAFE_INTEGER,
    };
    private clientBuilder: HttpClientBuilder = (auth?: AuthorizationProvider) => new GotHttpClient(httpClient(this.enterpriseToken !== undefined), auth);

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
     * The enterprise API is functionally equal with the data API, however, it looses the rate limits and with that allows
     * much more requests per time unit compared to the general available data API. To use it, you require an enterprise access
     * token.
     *
     * @param token The Enterprise Access Token provided by CFTools
     */
    public withEnterpriseApi(token: string): CFToolsClientBuilder {
        this.enterpriseToken = token;
        return this;
    }

    /**
     * The Enterprise API comes with special endpoint parameter for `/v1/users/resolve` (`client#resolve`), which allows to
     * create a new CFTools account for an identity token that has never played on a CFTools Cloud-enabled server before.
     * This functionality is not available to everyone with an Enterprise API token, but requires explicit access by CFTools.
     * @param status Whether to enable the account creation API
     */
    public withAccountCreationAPI(status: boolean): CFToolsClientBuilder {
        this.hasAccountCreationAccess = status;
        if (this.hasAccountCreationAccess && !this.enterpriseToken) {
            throw new Error('Account creation API requires an Enterprise API access token');
        }
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
     * Allows to set the HTTP Client library builder. Intended use case is to modify the options that is passed to the
     * built-in client builder, however, this can also be used to use your own preferred HTTP library with the sdk, as
     * long as it adheres to the HttpClientBuilder contract.
     *
     * Example use case enabling debug logging and setting your own User Agent in requests:
     * ```
     * import {CFToolsClientBuilder, httpClient} from 'cftools-sdk';
     *
     * new CFToolsClientBuilder()
     *   .withHttpClient(() => new GotHttpClient(httpClient(false, {userAgent: 'myTool/1.0.0 (https://github.com/username/tool-repo)', enableDebugLogging: true})))
     *   .withServerApiId(process.env.CFTOOLS_SERVER_API_ID)
     *   .withCredentials(process.env.CFTOOLS_APPLICATION_ID, process.env.CFTOOLS_APPLICATION_SECRET)
     *   .build()
     * ```
     * @param clientBuilder
     */
    public withHttpClient(clientBuilder: HttpClientBuilder): CFToolsClientBuilder {
        this.clientBuilder = clientBuilder;
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
        let auth: AuthorizationProvider | undefined = undefined;
        if (this.credentials && this.enterpriseToken) {
            auth = new EnterpriseAuthorizationProvider(this.credentials, this.enterpriseToken);
        } else if (this.credentials) {
            auth = new CFToolsAuthorizationProvider(this.credentials);
        } else {
            auth = new NoOpAuthorizationProvider();
        }
        const client = new GotCFToolsClient(this.clientBuilder(auth), this.serverApiId, this.enterpriseToken, this.hasAccountCreationAccess, auth);
        if (this.cache !== undefined) {
            return new CachingCFToolsClient(this.cache, this.cacheConfig, client, this.serverApiId);
        }
        return client;
    }
}
