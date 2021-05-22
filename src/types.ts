export type GenericId = SteamId64 | BattlEyeGUID | BohemiaInteractiveId | CFToolsId;

export interface CFToolsClient {
    getPlayerDetails(id: GenericId): Promise<Player>
    getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]>
    getPriorityQueue(id: GenericId): Promise<PriorityQueueItem | null>
    putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void>
    deletePriorityQueue(id: GenericId): Promise<void>
}

export class ServerApiId {
    private constructor(public readonly id: string) {
    }

    static of(id: string): ServerApiId {
        return new ServerApiId(id);
    }
}

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
    expires: Date | 'Permanent',
    comment: string,
    id: CFToolsId,
}

export interface Player {
    names: string[],
}

export class ResourceNotFound extends Error {}
export class InvalidCredentials extends Error {}
