import { DefaultAzureCredential, InteractiveBrowserCredential } from "@azure/identity";
export function login() {
    const credential = new InteractiveBrowserCredential();
    console.log(credential);
}