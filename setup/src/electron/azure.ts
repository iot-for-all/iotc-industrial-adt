import { API_VERSIONS } from "./core/constants";
import fetch from 'node-fetch';


export async function getAdtModels(hostname: string, accessToken: string) {
    let models = [];
    let url = `https://${hostname}/models?includeModelDefinition=true&api-version=${API_VERSIONS.DigitalTwinsData}`;
    while (url) {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (res.status !== 200) {
            throw new Error(res.statusText);
        }
        const data: any = await res.json();
        if (data.value) {
            models.push(...data.value.map(v => v.model));
        }
        if (data.nextLink) {
            url = data.nextLink;
        }
        else {
            url = null;
        }
    }
    return models;

}

export async function getAdtTwins(hostname: string, accessToken: string, filter?: string) {
    let twins = [];
    let url = `https://${hostname}/query?&api-version=${API_VERSIONS.DigitalTwinsData}`;
    const body = {
        "query": `SELECT * FROM DIGITALTWINS${filter ? ` WHERE ${filter}` : ''}`
    }
    while (url) {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Encoding': 'utf-8'
            }
        });
        if (res.status !== 200) {
            throw new Error(res.statusText);
        }
        const data: any = await res.json();
        if (data.value) {
            twins.push(...data.value);
        }
        if (data.continuationToken) {
            url = data.continuationToken;
        }
        else {
            url = null;
        }
    }
    return twins;

}