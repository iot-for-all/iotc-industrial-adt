import { AccountInfo, AuthenticationResult, AuthorizationUrlRequest, Configuration, CryptoProvider, PublicClientApplication, TokenCacheContext } from '@azure/msal-node';
import { CACHE_LOCATION, REDIRECT_URL } from './core/constants';
import fs from 'fs/promises';
import path from 'path';
import { BrowserWindow, protocol } from 'electron';


const cachePlugin = {
    beforeCacheAccess: async (cacheContext: TokenCacheContext) => {
        try {
            const data = await fs.readFile(CACHE_LOCATION, 'utf-8');
            return cacheContext.tokenCache.deserialize(data);
        } catch (ex) {
            await fs.writeFile(CACHE_LOCATION, cacheContext.tokenCache.serialize());
        }
    },
    afterCacheAccess: async (cacheContext: TokenCacheContext) => {
        if (cacheContext.cacheHasChanged) {
            await fs.writeFile(CACHE_LOCATION, cacheContext.tokenCache.serialize());
        }
    }
}


const MSAL_CONFIG: Configuration = {
    auth: {
        clientId: "3e9a455b-b362-4872-a159-7b769ad497fe",
        authority: "https://login.microsoftonline.com/4ac2d501-d648-4bd0-8486-653a65f90fc7"

    },
    cache: {
        cachePlugin
    }
};

const msalInstance = new PublicClientApplication(MSAL_CONFIG);
let account: AccountInfo;
const basicAuthParameters = {
    scopes: ['user.read'],
    redirectUri: `${REDIRECT_URL}://auth`,
    extraScopesToConsent: ['https://management.azure.com/user_impersonation']
}

async function getAccount(): Promise<AccountInfo> {
    // need to call getAccount here?
    const cache = msalInstance.getTokenCache();
    const currentAccounts = await cache.getAllAccounts();

    if (currentAccounts === null) {
        console.log("No accounts detected");
        return null;
    }

    if (currentAccounts.length > 1) {
        // Add choose account code here
        console.log("Multiple accounts detected, need to add choose account code.");
        return currentAccounts[0];
    } else if (currentAccounts.length === 1) {
        return currentAccounts[0];
    } else {
        return null;
    }
}


async function listenForAuthCode(navigateUrl: string, authWindow: BrowserWindow) {
    return new Promise<string>((res, rej) => {
        const registered = protocol.registerFileProtocol(REDIRECT_URL, (req, callback) => {
            const requestUrl = new URL(req.url);
            // parsing redirect query string to get auth code
            const authCode = requestUrl.searchParams.get('code');
            if (authCode) {
                protocol.unregisterProtocol(REDIRECT_URL);
                res(authCode);
            }
            else {
                rej(new Error('no code in URL'));
            }
            callback(path.normalize(`${__dirname}/${requestUrl.pathname}`));
        });
        authWindow.webContents.openDevTools();
        authWindow.loadURL(navigateUrl);
    });
}


async function getTokenInteractive(authWindow: BrowserWindow, tokenRequest?: AuthorizationUrlRequest): Promise<AuthenticationResult> {
    // Generate PKCE Challenge and Verifier before request
    const cryptoProvider = new CryptoProvider();
    const { challenge, verifier } = await cryptoProvider.generatePkceCodes();

    // Add PKCE params to Auth Code URL request
    const authCodeUrlParams = {
        ...basicAuthParameters,
        scopes: tokenRequest?.scopes,
        codeChallenge: challenge,
        codeChallengeMethod: "S256"
    };

    // Get Auth Code URL
    const authCodeUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParams);

    const authCode = await listenForAuthCode(authCodeUrl, authWindow);

    // Use Authorization Code and PKCE Code verifier to make token request
    return await msalInstance.acquireTokenByCode({
        ...basicAuthParameters,
        code: authCode,
        codeVerifier: verifier
    });
}

async function handleResponse(response: AuthenticationResult) {
    if (response !== null) {
        account = response.account;
    } else {
        account = await getAccount();
    }

    return account;
}

export async function getToken(resource: string) {
    try {
        const authResult = await msalInstance.acquireTokenSilent({
            scopes: [resource],
            account
        });
        return authResult.accessToken;
    }
    catch (e) {

        const authResult = await getTokenInteractive(new BrowserWindow({
            height: 600,
            width: 400,
        }), {
            ...basicAuthParameters,
            scopes: ['https://management.azure.com/user_impersonation']
        });
        return handleResponse(authResult);
    }
}

export async function login(authWindow: BrowserWindow) {
    try {
        const authResult = await getTokenInteractive(authWindow);
        return handleResponse(authResult);
    }
    catch (e) {
        console.log(e);
    }
}

export async function loginSilent(): Promise<AccountInfo> {
    if (!account) {
        account = await getAccount();
    }
    return account;
}

export async function logout(): Promise<void> {
    if (account) {
        await msalInstance.getTokenCache().removeAccount(account);
        account = null;
    }
}