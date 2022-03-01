import { AccountInfo, Configuration, PublicClientApplication } from "@azure/msal-browser";
import axios from "axios";


export const v1Config: Configuration = {
    auth: {
        clientId: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
        authority: "https://login.microsoftonline.com/common", // This is a URL (e.g. https://login.microsoftonline.com/{your tenant ID})
        redirectUri: "http://localhost",


    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    }
}

export const msalConfig = {
    auth: {
        clientId: "83417053-8ce3-413c-8698-7830a8954fbf",
        authority: "https://login.microsoftonline.com/common",
        // authority: "https://login.microsoftonline.com/4ac2d501-d648-4bd0-8486-653a65f90fc7", // This is a URL (e.g. https://login.microsoftonline.com/{your tenant ID})
        redirectUri: "http://localhost:3000",
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    }
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest = {
    scopes: ["User.Read"]
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphPhotoEndpoint: "https://graph.microsoft.com/v1.0/me/photo/$value"
};

export const msalInstance = new PublicClientApplication(msalConfig);
// export const v1Instance = new PublicClientApplication(msalConfig)

export async function login() {
    console.log('poppin up');
    const auth = await msalInstance.loginPopup(loginRequest)
    console.log(JSON.stringify(auth));
    return { ...auth.account };
}

export async function getPicture(account: AccountInfo) {
    const resp = await axios.get(graphConfig.graphPhotoEndpoint, {
        responseType: 'arraybuffer',
        headers: {
            Authorization: `Bearer ${(await msalInstance.acquireTokenSilent({ ...loginRequest, account })).accessToken}`
        }
    });
    return window.btoa(String.fromCharCode(...new Uint8Array(resp.data)));
}

export async function logout() {
    await msalInstance.logoutPopup();
}