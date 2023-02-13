import { LogoutApiRequest, StoreApiResponse } from "./model";

export abstract class Web3AuthApi {
    static baseUrl = "https://broadcast-server.tor.us";

    static async authorizeSession(key: String): Promise<StoreApiResponse> {
        const response = await fetch(`${this.baseUrl}/store/get?key=` + key, {
            method: 'GET'
        });

        return await response.json();
    }

    static async logout(logoutApiRequest: LogoutApiRequest): Promise<any> {
        const response = await fetch(`${this.baseUrl}/store/set`, {
            method: 'POST',
            body: JSON.stringify({
                logoutApiRequest
            })
        });

        return await response.json();
    }
}