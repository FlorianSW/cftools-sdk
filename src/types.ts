export interface CFToolsClient {
    playerDetails(id: SteamId64 | BattlEyeGUID | BohemiaInteractiveId | CFToolsId): Promise<Player>
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

export interface Player {
    names: string[],
}

export class ResourceNotFound extends Error {}
export class InvalidCredentials extends Error {}
