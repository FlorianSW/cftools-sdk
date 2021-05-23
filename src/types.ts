export type GenericId = SteamId64 | BattlEyeGUID | BohemiaInteractiveId | CFToolsId;

export interface CFToolsClient {
    /**
     * Returns metdata about an individual player.
     */
    getPlayerDetails(id: GenericId): Promise<Player>

    /**
     * Creates a leaderboard based on the requested statistic in the requested order.
     * The fields of an individual leaderboard item may vary based on the requested base statistics.
     */
    getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]>

    /**
     * Returns the meta information of the priority queue of the player. If the player does
     * not have priority queue for this server, it will return null.
     */
    getPriorityQueue(id: GenericId): Promise<PriorityQueueItem | null>

    /**
     * Creates a priority queue entry for the given player. The entry will grant the player either permanent or
     * temporary priority queue access for the server.
     * If the player already has a priority queue entry, this entry will be deleted before the new one is created.
     */
    putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void>

    /**
     * Drops the priority queue of the player if the player has a priority queue entry for the server. Does not error
     * when the player does not have a priority queue entry.
     */
    deletePriorityQueue(id: GenericId): Promise<void>

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

export interface GetLeaderboardRequest {
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

export interface PutPriorityQueueItemRequest {
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

export class ResourceNotFound extends Error {}
export class InvalidCredentials extends Error {}
