import {
    Authorization,
    AuthorizationProvider,
    AuthorizationType,
    BearerAuthorization,
    EnterpriseAuthorization,
    InvalidCredentials,
    LoginCredentials,
    TokenExpired
} from '../types';
import {Headers, HTTPError} from 'got';
import {HttpClient} from './http';

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

    async provide(client: HttpClient): Promise<Authorization> {
        if (this.hasToken()) {
            return new BearerAuthorization(AuthorizationType.BEARER, this.token as string, this.created!!, this.expired!!);
        } else {
            return new BearerAuthorization(AuthorizationType.BEARER, await this.fetchToken(client), this.created!!, this.expired!!);
        }
    }

    reportExpired() {
        this.token = undefined;
        this.expired = undefined;
    }

    protected fetchTokenHeaders(): Headers {
        return {};
    }

    private setToken(token: string) {
        this.token = token;
        this.created = new Date();
        this.expired = new Date();
        this.expired.setDate(this.expired.getHours() + 23);
    }

    private hasToken(): boolean {
        return !!this.token && this.expired !== undefined && this.expired.getTime() >= new Date().getTime();
    }

    private async fetchToken(client: HttpClient): Promise<string> {
        try {
            const response = await client.post<GetTokenResponse>('v1/auth/register', {
                headers: this.fetchTokenHeaders(),
                body: JSON.stringify({
                    application_id: this.credentials.applicationId,
                    secret: this.credentials.secret
                } as GetTokenRequest),
            });
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

export class EnterpriseAuthorizationProvider extends CFToolsAuthorizationProvider {
    constructor(credentials: LoginCredentials, private readonly enterpriseToken: string) {
        super(credentials);
    }

    async provide(client: HttpClient): Promise<Authorization> {
        const parent = await super.provide(client);
        return EnterpriseAuthorization.from(this.enterpriseToken, parent);
    }

    protected fetchTokenHeaders(): Headers {
        return {
            'X-Enterprise-Access-Token': this.enterpriseToken,
        };
    }
}

export class NoOpAuthorizationProvider implements AuthorizationProvider {
    async provide(): Promise<Authorization> {
        return {
            asHeader(): Record<string, string | string[] | undefined> {
                return {};
            },
            throwExpired(url: string): TokenExpired {
                return new TokenExpired(url, {
                    type: AuthorizationType.NOOP,
                    token: '',
                    created: new Date(),
                    expiresAt: new Date(),
                })
            }
        };
    }
    reportExpired(): void {
    }
}
