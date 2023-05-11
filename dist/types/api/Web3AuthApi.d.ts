import { LogoutApiRequest, StoreApiResponse } from "./model";
export declare abstract class Web3AuthApi {
    static baseUrl: string;
    static authorizeSession(key: String): Promise<StoreApiResponse>;
    static logout(logoutApiRequest: LogoutApiRequest): Promise<any>;
}
