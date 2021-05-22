import {InvalidCredentials, LoginCredentials} from '../types';
import {URL} from 'url';
import got, {HTTPError} from 'got';
import {baseUrl} from './constants';

interface GetTokenRequest {
    application_id: string,
    secret: string,
}

interface GetTokenResponse {
    token: string,
}

export class CFToolsAuthorizationProvider {
    private token: string | undefined;
    private expired: Date;

    constructor(private credentials: LoginCredentials) {
        if (process.env.CFTOOLS_API_TOKEN) {
            this.token = process.env.CFTOOLS_API_TOKEN;
        }
        this.expired = new Date();
        this.expired.setDate(this.expired.getDate() + 1);
    }

    async provideToken(): Promise<string> {
        if (this.hasToken()) {
            return this.token as string;
        } else {
            return await this.fetchToken();
        }
    }

    private setToken(token: string) {
        this.token = token;
        this.expired = new Date();
        this.expired.setDate(this.expired.getDate() + 1);
    }

    private hasToken(): boolean {
        return !!this.token && !!this.expired && this.expired.getTime() <= new Date().getTime();
    }

    private async fetchToken(): Promise<string> {
        const url = new URL('/v1/auth/register', baseUrl);
        try {
            const response = await got.post(url, {
                body: JSON.stringify({
                    application_id: this.credentials.applicationId,
                    secret: this.credentials.secret
                } as GetTokenRequest)
            }).json<GetTokenResponse>();
            this.setToken(response.token);
            return response.token;
        } catch (error) {
            if (error instanceof HTTPError && (error.response.statusCode === 500 || error.response.statusCode === 403)) {
                throw new InvalidCredentials();
            }
            throw error;
        }
    }
}
