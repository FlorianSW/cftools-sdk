import {HitZones, WeaponStatistic} from '../../types';

export function toHitZones(zones?: GetPlayerResponseHitZones): HitZones {
    return {
        torso: zones?.torso || 0,
        rightLeg: zones?.rightleg || 0,
        rightHand: zones?.righthand || 0,
        rightArm: zones?.rightarm || 0,
        leftLeg: zones?.leftleg || 0,
        head: zones?.head || 0,
        leftFoot: zones?.leftfoot || 0,
        leftArm: zones?.leftarm || 0,
        brain: zones?.brain || 0,
    };
}

export function toWeaponBreakdown(weapons?: GetPlayerResponseWeapons): { [className: string]: WeaponStatistic } {
    const entries = weapons ? Object.entries(weapons) : [];
    const result: { [className: string]: WeaponStatistic } = {};
    for (let w of entries) {
        result[w[0]] = {
            damage: w[1].damage || 0,
            hits: w[1].hits || 0,
            deaths: w[1].deaths || 0,
            kills: w[1].kills || 0,
            longestKill: w[1].longest_kill || 0,
            longestShot: w[1].longest_shot || 0,
            hitZones: toHitZones(w[1].zones),
        } as WeaponStatistic
    }

    return result;
}

export interface GetPlayerResponseHitZones {
    brain?: number,
    head?: number,
    leftarm?: number,
    leftfoot?: number,
    leftleg?: number,
    rightarm?: number,
    righthand?: number,
    rightleg?: number,
    torso?: number,
}

export interface GetPlayerResponseWeapons {
    [className: string]: {
        damage?: number,
        deaths?: number,
        hits?: number,
        kills?: number,
        longest_kill?: number,
        longest_shot?: number,
        zones?: GetPlayerResponseHitZones,
    }
}

export interface GetPlayerResponse {
    [key: string]: {
        omega: {
            name_history: string[],
            playtime: number,
            sessions: number,
        },
        game: {
            general: {
                kills?: number,
                deaths?: number,
                environment_deaths?: number,
                infected_deaths?: number,
                suicides?: number,
                hits?: number,
                kdratio?: number,
                longest_kill?: number,
                longest_shot?: number,
                weapons?: GetPlayerResponseWeapons,
                zones?: GetPlayerResponseHitZones
            }
        }
    },
}

export interface GetUserLookupResponse {
    cftools_id: string,
}

export interface GetLeaderboardResponse {
    leaderboard: {
        cftools_id: string,
        deaths: number,
        environment_deaths: number,
        hits: number,
        infected_deaths: number,
        kdratio: number,
        kills: number,
        latest_name: string,
        longest_kill: number,
        longest_shot: number,
        playtime: number,
        rank: number,
        suicides: number,
    }[]
}

export interface GetPriorityQueueEntry {
    entries: {
        created_at: string,
        creator: {
            cftools_id: string
        },
        meta: {
            comment: string,
            expiration: string | null,
            from_api: boolean
        },
        updated_at: string,
        user: {
            cftools_id: string
        },
        uuid: string
    }[]
}

export interface GetGameServerDetailsResponse {
    [key: string]: {
        _object: {
            error: string,
        },
        attributes: {
            dlc: boolean,
            dlcs: {
                livonia: boolean,
            },
            experimental: boolean,
            hive: 'private' | 'public',
            modded: boolean,
            official: boolean,
            shard: string,
            whitelist: boolean,
        },
        environment: {
            perspectives: {
                '1rd': boolean,
                '3rd': boolean,
            },
            time: string,
            time_acceleration: {
                general: number,
                night: number
            },
        },
        game: number,
        geolocation: {
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
        },
        host: {
            address: string,
            game_port: number,
            os: 'w' | 'l',
            query_port: number,
        },
        map: string,
        mods: {
            file_id: number,
            name: string,
        }[],
        name: string,
        offline: boolean,
        online: boolean,
        publisher: {
            monetization: boolean,
        },
        rank: number,
        rating: number,
        security: {
            battleye: boolean,
            password: boolean,
            vac: boolean,
        },
        status: {
            bots: boolean,
            players: number,
            queue: {
                active: boolean,
                size: number,
            },
            slots: number,
        },
        version: string
    },
}

export interface GetBanResponse {
    entries: {
        created_at: string,
        expires_at: string | null,
        id: string,
        identifier: string,
        reason: string,
        updated_at: string,
    }[],
}
