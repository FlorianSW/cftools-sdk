import {Authorization, AuthorizationProvider, AuthorizationType, InvalidCredentials, LoginCredentials} from '../types';
import {HTTPError} from 'got';
import {httpClient} from './http';

interface GetTokenRequest {
    application_id: string,
    secret: string,
}

interface GetTokenResponse {
    token: string,
}

export class CFToolsAuthorizationProvider implements AuthorizationProvider {
    private token: string | undefined;
    private created: Date | undefined;
    private expired: Date | undefined;

    constructor(private credentials: LoginCredentials) {
        if (process.env.CFTOOLS_API_TOKEN) {
            this.setToken(process.env.CFTOOLS_API_TOKEN);
        }
    }

    async provide(): Promise<Authorization> {
        if (this.hasToken()) {
            return new Authorization(AuthorizationType.BEARER, this.token as string, this.created!!, this.expired!!);
        } else {
            return new Authorization(AuthorizationType.BEARER, await this.fetchToken(), this.created!!, this.expired!!);
        }
    }

    reportExpired() {
        this.token = undefined;
        this.expired = undefined;
    }

    private setToken(token: string) {
        this.token = token;
        this.created = new Date();
        this.expired = new Date();
        this.expired.setDate(this.expired.getHours() + 23);
    }

    private hasToken(): boolean {
        return !!this.token && !!this.expired && this.expired.getTime() <= new Date().getTime();
    }

    private async fetchToken(): Promise<string> {
        try {
            const response = await httpClient.post('v1/auth/register', {
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
