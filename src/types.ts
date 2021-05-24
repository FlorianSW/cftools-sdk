export type GenericId = SteamId64 | BattlEyeGUID | BohemiaInteractiveId | CFToolsId;

export interface CFToolsClient {
    /**
     * Returns metadata about an individual player.
     *
     * This request requires an authenticated client.
     */
    getPlayerDetails(id: GenericId): Promise<Player>

    getPlayerDetails(id: GetPlayerDetailsRequest): Promise<Player>

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
    getPriorityQueue(id: GenericId): Promise<PriorityQueueItem | null>

    getPriorityQueue(id: GetPriorityQueueRequest): Promise<PriorityQueueItem | null>

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
    deletePriorityQueue(id: GenericId): Promise<void>

    deletePriorityQueue(id: DeletePriorityQueueRequest): Promise<void>

    /**
     * Return information about a specific game server instance. These information are not related to a specific
     * CFTools Cloud server instance.
     */
    getGameServerDetails(request: GetGameServerDetailsRequest): Promise<GameServerItem>
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

export class BattlEyeGUID {
    private constructor(public readonly guid: string) {
    }

    static of(guid: string): BattlEyeGUID {
        return new BattlEyeGUID(guid);
    }
}

export class SteamId64 {
    private constructor(public readonly id: string) {
    }

    static of(id: string): SteamId64 {
        return new SteamId64(id);
    }
}

export class BohemiaInteractiveId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): BohemiaInteractiveId {
        return new BohemiaInteractiveId(id);
    }
}

export class CFToolsId {
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
    KILL_DEATH_RATION = 'kdratio',
}

interface IdRequest extends OverrideServerApiId {
    playerId: GenericId,
}

export interface GetPlayerDetailsRequest extends IdRequest {
}

export interface GetPriorityQueueRequest extends IdRequest {
}

export interface DeletePriorityQueueRequest extends IdRequest {
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
    rank: 1,
    suicides?: 1,
    environmentDeaths?: number,
}

export interface PriorityQueueItem {
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

export interface Player {
    names: string[],
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

export interface OverrideServerApiId {
    serverApiId?: ServerApiId,
}

/**
 * Indicates that the requested resource (e.g. a server, a priority queue entry or a player ID) does not exist
 * in the CFTools Cloud database.
 */
export class ResourceNotFound extends Error {
}

/**
 * The client tried to receive an authentication token with the provided API credentials (application ID and secret)
 * but failed with an error that indicates that the provided credentials are invalid or expired.
 */
export class InvalidCredentials extends Error {
}

/**
 * Indicates that a method/an endpoint was called which requires authentication. However, the used client instance
 * is not authenticated.
 * @see CFToolsClientBuilder.withCredentials
 */
export class AuthenticationRequired extends Error {
}

/**
 * Indicates that a method/an endpoint was called which requires a server API ID. However, the request to the method
 * did not contain a server API ID and the client did not have a default server API ID set. Re-call the method with either
 * a client which has a default server API ID set or provide on in the request parameter of the method.
 */
export class ServerApiIdRequired extends Error {
}

/**
 * The request exceeded the rate limit of the requested route. Consult the documentation to find out the limit for the
 * requested resource and try the request again after the rate limit passed.
 */
export class RequestLimitExceeded extends Error {
}

/**
 * The request attempted to create the requested resource but failed as the resource already exists.
 *
 * For an SDK method that ensures, that the resource which creation is attempted does not exist before creating it, this
 * usually means the resource was created after the resource was checked for existence or deletion, but before the
 * resource could be created by the SDK.
 */
export class DuplicateResourceCreation extends Error {
}

/**
 * The request was aborted with an internal server error indicating that an unexpected error occurred. You may want to
 * retry the request in order to see if that was a temporary problem, consult the documentation for indicators why
 * this could happen or contact the support.
 */
export class UnknownError extends Error {
    constructor(public readonly requestId: string) {
        super(requestId);
    }
}

/**
 * The request was aborted as it exceeded the maximum time it is supposed to run. This could be the result of
 * temporary overload of the CFTools service.
 */
export class TimeoutError extends Error {
}

/**
 * The request was aborted by CFTools indicating that the service is currently unavailable. Consult the status page
 * of the service to gather information about the problem. Contact the support if the problem persists.
 */
export class CFToolsUnavailable extends Error {
}

/**
 * The request tried to interact with a resource for which the provided application credentials do not have access to.
 * Make sure you grant access to the resource for the application (see the grant flow in the documentation).
 */
export class GrantRequired extends Error {
}

/**
 * The supplied authentication token in the request is valid but expired and needs to be re-generated.
 *
 * With regard to the SDK, this error should not happen as the token is refreshed before it expires.
 */
export class TokenExpired extends Error {
}
