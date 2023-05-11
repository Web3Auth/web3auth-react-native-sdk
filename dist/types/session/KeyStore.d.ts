import { EncryptedStorage } from "../types/IEncryptedStorage";
import { SecureStore } from "../types/IExpoSecureStore";
export default class KeyStore {
    storage: SecureStore | EncryptedStorage;
    constructor(storage: SecureStore | EncryptedStorage);
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
