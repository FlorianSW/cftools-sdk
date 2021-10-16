export interface CFToolsClient {
    /**
     * Returns metadata about an individual player.
     *
     * This request requires an authenticated client.
     */
    getPlayerDetails(id: GenericId | GetPlayerDetailsRequest): Promise<Player>

    /**
     * Creates a leaderboard based on the requested statistic in the requested order.
     * The fields of an individual leaderboard item may vary based on the requested base statistics.
     *
     * This request requires an authenticated client.
     */
    getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]>

    /**
     * Returns the meta information of the priority queue of the player. If the player does
     * not have priority queue for this server, it will return null.
     *
     * This request requires an authenticated client.
     */
    getPriorityQueue(id: GenericId | GetPriorityQueueRequest): Promise<PriorityQueueItem | null>

    /**
     * Creates a priority queue entry for the given player. The entry will grant the player either permanent or
     * temporary priority queue access for the server.
     * If the player already has a priority queue entry, this entry will be deleted before the new one is created.
     *
     * This request requires an authenticated client.
     */
    putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void>

    /**
     * Drops the priority queue of the player if the player has a priority queue entry for the server. Does not error
     * when the player does not have a priority queue entry.
     *
     * This request requires an authenticated client.
     */
    deletePriorityQueue(id: GenericId | DeletePriorityQueueRequest): Promise<void>

    /**
     * Returns the meta information of the whitelist entry of the player. If the player does
     * not have a whitelist entry for this server, it will return null.
     *
     * This request requires an authenticated client.
     */
    getWhitelist(id: GenericId | GetWhitelistRequest): Promise<WhitelistItem | null>

    /**
     * Creates a whitelist entry for the given player. If the player already has a whitelist entry,
     * this entry will be deleted before the new one is created.
     *
     * This request requires an authenticated client.
     */
    putWhitelist(request: PutWhitelistItemRequest): Promise<void>

    /**
     * Drops the whitelist entry of the player if the player has a whitelist entry for the server. Does not error
     * when the player does not have a whitelist entry.
     *
     * This request requires an authenticated client.
     */
    deleteWhitelist(id: GenericId | DeleteWhitelistRequest): Promise<void>

    /**
     * Return information about a specific game server instance. These information are not related to a specific
     * CFTools Cloud server instance.
     */
    getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem>

    /**
     * Returns basic information of the CFTools server. This is information of the server entry in the
     * CFTools Cloud platform. It does not contain the game server information, use getGameServerDetails() for such
     * information.
     */
    getServerInfo(request: GetServerInfoRequest): Promise<ServerInfo>

    /**
     * Requests a list of currently active game sessions on the server. It will contain some meta data to the session
     * itself and you'll need an entry of the returned list when you want to interact with the corresponding player/session.
     */
    listGameSessions(request: ListGameSessionsRequest): Promise<GameSession[]>

    /**
     * BETA: This feature uses an API that is marked as Beta in the CFTools API.
     *
     * Spawns the requested item class, if it exists, to the player associated with the requested GameSession ID. You
     * an request a specific quantity; if you omit the parameter, the default value (1) will be used.
     *
     * This API may throw UnknownErrors, as some edge cases might not be handled already.
     *
     * Requires the GameLabs integration to be installed on the server (the default serverApiId or the one provided in the
     * request)
     *
     * @beta
     */
    spawnItem(request: SpawnItemRequest): Promise<void>

    /**
     * BETA: This feature uses an API that is marked as Beta in the CFTools API.
     *
     * Teleports the player associated with the requested GameSession to the coordinates requested.
     *
     * Requires the GameLabs integration to be installed on the server (the default serverApiId or the one provided in the
     * request)
     *
     * @beta
     */
    teleport(request: TeleportPlayerRequest): Promise<void>

    /**
     * Return the list of bans registered for the requested player. Both, expired and currently enforced bans, are
     * returned as a result of this method.
     *
     * If the requested user is not and was never banned so far, an empty list is returned.
     */
    listBans(request: ListBansRequest): Promise<Ban[]>

    /**
     * Creates a new entry in the banlist for the provided player. A reason is required to ban a player. It is either
     * a temporary or permanent ban, based on the provided expiration.
     */
    putBan(request: PutBanRequest): Promise<void>

    /**
     * Deletes an entry on the ban list for the provided player or ban. Given the player is not banned, this method
     * does nothing. If the player has multiple bans in the ban list, an error will be thrown. Delete the ban by
     * providing the ban you want to delete (as requested with the listBans method).
     *
     * This method will delete the ban, instead of just revoking it. The ban details will not be available in the
     * banlist afterwards anymore.
     */
    deleteBan(request: DeleteBanRequest): Promise<void>

    /**
     * Same as deleteBan(request: DeleteBanRequest) with the only difference, that this method will delete all bans
     * of the player in that banlist. This includes expired and revoked bans!
     *
     * WARNING: This method will attempt to permanently delete all bans in the banlist for that player without any further
     * confirmation.
     *
     * The performance of that operation depends on the underlying implementation. However, the time the operation takes
     * may scale linear to the amount of entries for that player on the ban list. Consult the documentation of the
     * implementation, if any, to find out more about this implementation detail.
     */
    deleteBans(request: DeleteBansRequest): Promise<void>
}

export interface Cache {
    /**
     * Returns the cached/saved value for the specified cache key. If there was never a set for the same cache key,
     * undefined is returned.
     *
     * If the value saved for the cache key is already expired, it is assumed to be not present, and undefined is
     * returned.
     */
    get<T>(cacheKey: string): T | undefined;

    /**
     * Saves the value to the specified cache key. Optionally, an expiry in seconds can be specified. If the value
     * is omitted, an implementation-details dependant default expiration is assumed.
     *
     * When implementing this interface, document what the default value for the expiry is.
     */
    set<T>(cacheKey: string, value: T, expiry?: number): void;
}

export interface AuthorizationProvider {
    /**
     * Returns an authorization that can be used together with the CFTools Data API. The token provided by this
     * function is guaranteed to be valid for enough time to make at least one request.
     *
     * The implementation decides if and how an authorization is cached between two subsequent calls to this method.
     * However, implementations should consider caching the authorization for as long as the authorization is valid (if
     * this information is available by the provider where the authorization was gathered from).
     */
    provide(): Promise<Authorization>;

    /**
     * A back-channel for users of the provided authorization from provide(). Should be used, when the authorization is,
     * different than expected, reported to be expired from CFTools. This should only be used while a request was made in
     * a reasonable amount of time after the authorization was gathered from the provider.
     *
     * It's up to the provider if this information is processed and used and how it is used. The provider might evict any
     * potential cache that might be used or refresh the authorization pre-maturely. It may also just ignore this report
     * as well.
     *
     * Implementations should respect this information from clients, as it gives reasonable doubt that the currently provided
     * authorization is invalid or expired for some reason.
     */
    reportExpired(): void;
}

export enum AuthorizationType {
    BEARER = 'Bearer'
}

export class Authorization {
    /**
     * An authorization for use with the CFTools Data API. The authorization consists of a type (currently, only Bearer
     * is supported by CFTools) as well as the value (token) needed to use within the authorization. The token is an
     * opaque string, users of this information are not expected to interpret this token.
     */
    constructor(readonly type: AuthorizationType, readonly token: string, readonly created: Date, readonly expiresAt: Date) {
    }

    asHeader(): string {
        return this.type + ' ' + this.token;
    }
}

/**
 * Configuration about how long and what should be cached when using a cached CFTools client.
 *
 * Each of the keys in this configuration applies to one method/action that the CFTools client
 * can execute. The value specifies the time in seconds the result of the action should be cached.
 */
export interface CacheConfiguration {
    gameServerDetails: number,
    serverInfo: number,
    gameSessions: number,
    leaderboard: number,
    playerDetails: number,
    priorityQueue: number,
    whitelist: number,
    banlist: number,
}

/**
 * The CFTools Cloud identifier for a specific server in CFTools Cloud. This ID can be found in the API
 * settings of the server.
 */
export class ServerApiId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): ServerApiId {
        return new ServerApiId(id);
    }
}

/**
 * API Credentials are necessary for API actions which require access to a specific server (nearly any action).
 * These credentials can be retrieved from the CFTools developer portal. You need to create an application first.
 */
export class LoginCredentials {
    private constructor(public readonly applicationId: string, public readonly secret: string) {
    }

    static of(applicationId: string, secret: string): LoginCredentials {
        return new LoginCredentials(applicationId, secret);
    }
}

export interface GenericId {
    readonly id: string;
}

export class BattlEyeGUID implements GenericId {
    private constructor(public readonly guid: string) {
    }

    get id(): string {
        return this.guid;
    }

    static of(guid: string): BattlEyeGUID {
        return new BattlEyeGUID(guid);
    }
}

export class SteamId64 implements GenericId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): SteamId64 {
        return new SteamId64(id);
    }
}

export class BohemiaInteractiveId implements GenericId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): BohemiaInteractiveId {
        return new BohemiaInteractiveId(id);
    }
}

export class CFToolsId implements GenericId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): CFToolsId {
        return new CFToolsId(id);
    }
}

export enum Statistic {
    KILLS = 'kills',
    DEATHS = 'deaths',
    SUICIDES = 'suicides',
    PLAYTIME = 'playtime',
    LONGEST_KILL = 'longest_kill',
    LONGEST_SHOT = 'longest_shot',
    KILL_DEATH_RATIO = 'kdratio',
    /**
     * @deprecated Use Statistic.KILL_DEATH_RATIO instead
     */
    KILL_DEATH_RATION = 'kdratio',
}

interface IdRequest extends OverrideServerApiId {
    playerId: GenericId,
}

export interface GetPlayerDetailsRequest extends IdRequest {
}

export interface GetPriorityQueueRequest extends IdRequest {
}

export interface GetWhitelistRequest extends IdRequest {
}

export interface DeletePriorityQueueRequest extends IdRequest {
}

export interface DeleteWhitelistRequest extends IdRequest {
}

export interface GetLeaderboardRequest extends OverrideServerApiId {
    order: 'ASC' | 'DESC',
    statistic: Statistic,
    limit?: number,
}

export interface LeaderboardItem {
    id: CFToolsId,
    name: string,
    playtime: number,
    rank: number,
    suicides: number,
    kills: number,
    hits: number,
    /**
     * @deprecated Use killDeathRatio instead
     */
    killDeathRation: number,
    killDeathRatio: number,
    longestKill: number,
    longestShot: number,
    deaths: number,
    environmentDeaths?: number,
}

export interface PriorityQueueItem {
    created: Date,
    createdBy: CFToolsId,
    comment: string,
    expiration: Date | 'Permanent',
}

export interface WhitelistItem {
    created: Date,
    createdBy: CFToolsId,
    comment: string,
    expiration: Date | 'Permanent',
}

export interface PutPriorityQueueItemRequest extends OverrideServerApiId {
    expires?: Date | 'Permanent',
    comment: string,
    id: CFToolsId,
}

export interface PutWhitelistItemRequest extends OverrideServerApiId {
    expires?: Date | 'Permanent',
    comment: string,
    id: CFToolsId,
}

export interface Player {
    names: string[],
    statistics: PlayerStatistics,
    /**
     * Playtime in seconds
     */
    playtime: number,
    sessions: number,
}

export interface PlayerStatistics {
    environmentDeaths: number,
    infectedDeaths: number,
    suicides: number,
    kills: number,
    deaths: number,
    hits: number,
    killDeathRatio: number,
    longestKill: number,
    longestShot: number,
    hitZones: HitZones,
    weaponsBreakdown: { [className: string]: WeaponStatistic }
}

export interface HitZones {
    brain: number,
    head: number,
    leftArm: number,
    leftFoot: number,
    leftLeg: number,
    rightArm: number,
    rightHand: number,
    rightLeg: number,
    torso: number,
}

export interface WeaponStatistic {
    damage: number,
    deaths: number,
    hits: number
    kills: number,
    longestKill: number,
    longestShot: number,
    hitZones: HitZones
}

export enum Game {
    DayZ = '1'
}

export interface GetGameServerDetailsRequest {
    game: Game,
    ip: string,
    port: number,
}

export interface GameHost {
    address: string,
    gamePort: number,
    queryPort: number,
}

export interface GameHostGeolocation {
    available: boolean,
    city: {
        name: string | null,
        region: string | null,
    },
    continent: string,
    country: {
        code: string,
        name: string,
    },
    timezone: string,
}

export interface GameSecurity {
    battleye: boolean,
    vac: boolean,
    password: boolean,
}

export interface SteamWorkshopMod {
    fileId: number,
    name: string,
}

export interface GameEnvironment {
    perspectives: {
        firstPersonPerspective: boolean,
        thirdPersonPerspective: boolean,
    },
    time: string,
    timeAcceleration: {
        general: number,
        night: number
    },
}

export interface GameServerItem {
    name: string,
    rank: number,
    rating: number,
    version: string,
    map: string,
    status: {
        players: {
            online: number,
            queue: number,
            slots: number,
        },
    },
    security: GameSecurity,
    online: boolean,
    mods: SteamWorkshopMod[],
    host: GameHost,
    geolocation: GameHostGeolocation,
    environment: GameEnvironment,
    attributes: {
        dlc: boolean,
        dlcs: {
            livonia: boolean,
        },
        experimental: boolean,
        hive: 'private' | 'public',
        modded: boolean,
        official: boolean,
        whitelist: boolean,
    },
}

export class Banlist {
    private constructor(public readonly id: string) {
    }

    static of(guid: string): Banlist {
        return new Banlist(guid);
    }
}

export interface ServerInfo {
    nickname: string;
    owner: CFToolsId;
    connection: {
        peerVersion: string;
        usedProtocol: 'UDP_RCON_BATTLEYE_DZ';
    };
    game: Game;
}

/**
 * Represents a session of a CFTools player in the specific game.
 * Optional information, like profile and ban information, are only available if Steam or any other third-party system
 * is available and integrated into the game.
 */
export interface GameSession {
    id: string;
    cftoolsId: CFToolsId;
    playerName: string;
    steamId: SteamId64;
    bans: {
        count: number;
        communityBanned?: boolean;
        economyBanned?: boolean;
        gameBanned?: boolean;
        vacBanned?: boolean;
    };
    profile?: {
        avatar: URL;
        name: string;
        private: boolean;
    }
}

export interface Ban {
    id: string,
    created: Date,
    reason: string,
    expiration: Date | 'Permanent',
    status: BanStatus,
}

export type BanStatus = 'Ban.ACTIVE' | 'Ban.INACTIVE';

export interface ListBansRequest {
    playerId: GenericId,
    list: Banlist,
}

export interface DeleteBanRequest {
    playerId?: GenericId,
    ban?: Ban,
    list: Banlist,
}

export interface DeleteBansRequest {
    playerId: GenericId,
    list: Banlist,
}

export interface PutBanRequest {
    playerId: GenericId,
    list: Banlist,
    expiration?: Date | 'Permanent',
    reason: string,
}

export interface GetServerInfoRequest extends OverrideServerApiId {
}

export interface ListGameSessionsRequest extends OverrideServerApiId {
}

export interface SpawnItemRequest extends OverrideServerApiId {
    session: GameSession;
    itemClass: string;
    /**
     * If omitted, the default value (1) will be assumed.
     */
    quantity?: number;
}

export interface Coordinates {
    x: number;
    y: number;
}

export interface TeleportPlayerRequest extends OverrideServerApiId {
    session: GameSession;
    coordinates: Coordinates;
}

export interface OverrideServerApiId {
    serverApiId?: ServerApiId,
}

/**
 * Indicates that the requested resource (e.g. a server, a priority queue entry or a player ID) does not exist
 * in the CFTools Cloud database.
 */
export class ResourceNotFound extends Error {
    constructor(url: string) {
        super('ResourceNotFound: ' + url);
        Object.setPrototypeOf(this, ResourceNotFound.prototype);
    }
}

/**
 * Indicates that the requested resource was found, however, the action on it could not be fulfilled as the required
 * bucket (like queuepriority or whitelist) was not configured on this resource. You should only retry this request
 * when you ensured that the respective bucket is now configured for the resource correctly.
 */
export class ResourceNotConfigured extends Error {
    constructor(resource: string) {
        super('ResourceNotConfigured: ' + resource);
        Object.setPrototypeOf(this, ResourceNotConfigured.prototype);
    }
}

/**
 * The client tried to receive an authentication token with the provided API credentials (application ID and secret)
 * but failed with an error that indicates that the provided credentials are invalid or expired.
 */
export class InvalidCredentials extends Error {
    constructor() {
        super('InvalidCredentials');
        Object.setPrototypeOf(this, InvalidCredentials.prototype);
    }
}

/**
 * Indicates that a method/an endpoint was called which requires authentication. However, the used client instance
 * is not authenticated.
 * @see CFToolsClientBuilder.withCredentials
 */
export class AuthenticationRequired extends Error {
    constructor() {
        super('AuthenticationRequired');
        Object.setPrototypeOf(this, AuthenticationRequired.prototype);
    }
}

/**
 * Indicates that a method/an endpoint was called which requires a server API ID. However, the request to the method
 * did not contain a server API ID and the client did not have a default server API ID set. Re-call the method with either
 * a client which has a default server API ID set or provide on in the request parameter of the method.
 */
export class ServerApiIdRequired extends Error {
    constructor() {
        super('ServerApiIdRequired');
        Object.setPrototypeOf(this, ServerApiIdRequired.prototype);
    }
}

/**
 * The request exceeded the rate limit of the requested route. Consult the documentation to find out the limit for the
 * requested resource and try the request again after the rate limit passed.
 */
export class RequestLimitExceeded extends Error {
    constructor(url: string) {
        super('RequestLimitExceeded: ' + url);
        Object.setPrototypeOf(this, RequestLimitExceeded.prototype);
    }
}

/**
 * The request attempted to create the requested resource but failed as the resource already exists.
 *
 * For an SDK method that ensures, that the resource which creation is attempted does not exist before creating it, this
 * usually means the resource was created after the resource was checked for existence or deletion, but before the
 * resource could be created by the SDK.
 */
export class DuplicateResourceCreation extends Error {
    constructor(url: string) {
        super('DuplicateResourceCreation: ' + url);
        Object.setPrototypeOf(this, DuplicateResourceCreation.prototype);
    }
}

/**
 * The request was aborted with an internal server error indicating that an unexpected error occurred. You may want to
 * retry the request in order to see if that was a temporary problem, consult the documentation for indicators why
 * this could happen or contact the support.
 */
export class UnknownError extends Error {
    constructor(url: string, public readonly requestId: string) {
        super('UnknownError: ' + url + ' (' + requestId + ')');
        Object.setPrototypeOf(this, UnknownError.prototype);
    }
}

/**
 * The request was aborted as it exceeded the maximum time it is supposed to run. This could be the result of
 * temporary overload of the CFTools service.
 */
export class TimeoutError extends Error {
    constructor(url: string) {
        super('TimeoutError: ' + url);
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * The request was aborted by CFTools indicating that the service is currently unavailable. Consult the status page
 * of the service to gather information about the problem. Contact the support if the problem persists.
 */
export class CFToolsUnavailable extends Error {
    constructor(url: string) {
        super('CFToolsUnavailable: ' + url);
        Object.setPrototypeOf(this, CFToolsUnavailable.prototype);
    }
}

/**
 * The request tried to interact with a resource for which the provided application credentials do not have access to.
 * Make sure you grant access to the resource for the application (see the grant flow in the documentation).
 */
export class GrantRequired extends Error {
    constructor(url: string) {
        super('GrantRequired: ' + url);
        Object.setPrototypeOf(this, GrantRequired.prototype);
    }
}

export interface TokenExpiredInfo {
    readonly type: AuthorizationType,
    /**
     * The authorization token that was reported as expired.
     */
    readonly token: string,
    /**
     * The date and time when this token was last created or refreshed.
     */
    readonly created: Date,
    /**
     * When this authorization token is expected to expire.
     */
    readonly expiresAt: Date,
}

/**
 * The supplied authentication token in the request is valid but expired and needs to be re-generated.
 *
 * With regard to the SDK, this error should not happen as the token is refreshed before it expires.
 */
export class TokenExpired extends Error {
    constructor(url: string, public readonly info: TokenExpiredInfo) {
        super('TokenExpired: ' + url);
        Object.setPrototypeOf(this, TokenExpired.prototype);
    }
}

/**
 * CFTools received an error, while fetching information from the upstream server of the requested resource. CFTools
 * needed these information in order to fulfill the request.
 */
export class GameServerQueryError extends Error {
    constructor(type: string) {
        super(`GameServerQueryError: ${type}`);
        Object.setPrototypeOf(this, GameServerQueryError.prototype);
    }
}

export class AmbiguousDeleteBanRequest extends Error {
    constructor() {
        super('AmbiguousDeleteBanRequest');
        Object.setPrototypeOf(this, AmbiguousDeleteBanRequest.prototype);
    }
}
