import Web3Auth

@available(iOS 13.0, *)
@objc(Web3authReactNativeSdk)
class Web3authReactNativeSdk: NSObject {
    
    private var web3auth: Web3Auth?
    
    @objc(init:withResolver:withRejecter:)
    func `init`(params: [String:String], resolve: RCTPromiseResolveBlock, reject:RCTPromiseRejectBlock) -> Void {
        guard
            let clientId: String = params["clientId"],
            let networkString: String = params["network"],
            let network = Network(rawValue: networkString)
        else {
            reject("ArgumentError", "invalid clientId or network", nil)
            return
        }
        web3auth = Web3Auth(W3AInitParams(clientId: clientId, network: network))
        resolve(nil)
    }
    
    @objc(login:withResolver:withRejecter:)
    func login(params: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        let provider = getWeb3AuthProvider(params["provider"] as? String)
        let relogin = params["relogin"] as? Bool
        let dappShare = params["dappShare"] as? String
        let redirectUrl = params["redirectUrl"] as? String
        let appState = params["appState"] as? String
        let login_hint = (params["extraLoginOptions"] as? [String: Any?])?["login_hint"] as? String
        let mfaLevel = getMfaLevel(params["mfaLevel"] as? String)
        if let w3a = web3auth {
            w3a.login(W3ALoginParams(
                loginProvider: provider,
                relogin: relogin,
                dappShare: dappShare,
                extraLoginOptions: login_hint == nil ? nil : ExtraLoginOptions(display: nil, prompt: nil, max_age: nil, ui_locales: nil, id_token_hint: nil, id_token: nil, login_hint: login_hint, acr_values: nil, scope: nil, audience: nil, connection: nil, domain: nil, client_id: nil, redirect_uri: nil, leeway: nil, verifierIdField: nil, isVerifierIdCaseSensitive: nil),
                redirectUrl: redirectUrl,
                appState: appState,
                mfaLevel: mfaLevel
            )) {
                switch $0 {
                case .success(let result):
                    let m: [String: Any] = [
                        "privKey": result.privKey,
                        "ed25519PrivKey": result.ed25519PrivKey,
                        "userInfo": [
                            "name": result.userInfo.name,
                            "profileImage": result.userInfo.profileImage,
                            "typeOfLogin": result.userInfo.typeOfLogin,
                            "aggregateVerifier": result.userInfo.aggregateVerifier,
                            "verifier": result.userInfo.verifier,
                            "verifierId": result.userInfo.verifierId,
                            "email": result.userInfo.email
                        ]
                    ]
                    resolve(m)
                case .failure(let error):
                    reject("LoginError", "Error occured during login with web3auth-swift-sdk", error)
                }
            }
        } else {
            reject("InitError", "init has not been called yet", nil)
        }
    }
    
    @objc(logout:withResolver:withRejecter:)
    func logout(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        resolve(nil)
    }
    
}

func getWeb3AuthProvider(_ str: String?) -> Web3AuthProvider? {
    guard
        let unwrappedStr = str
    else {
        return nil
    }
    let mapping: [String: Web3AuthProvider] = [
        "google": .GOOGLE,
        "facebook": .FACEBOOK,
        "reddit": .REDDIT,
        "discord": .DISCORD,
        "twitch": .TWITCH,
        "apple": .APPLE,
        "line": .LINE,
        "github": .GITHUB,
        "kakao": .KAKAO,
        "linkedin": .LINKEDIN,
        "twitter": .TWITTER,
        "weibo": .WEIBO,
        "wechat": .WECHAT,
        "email_passwordless": .EMAIL_PASSWORDLESS
    ]
    return mapping[unwrappedStr]
}

func getMfaLevel(_ str: String?) -> MFALevel? {
    guard
        let unwrappedStr = str
    else {
        return nil
    }
    let mapping: [String: MFALevel] = [
        "default": .DEFAULT,
        "optional": .OPTIONAL,
        "mandatory": .MANDATORY,
        "none": .NONE
    ]
    return mapping[unwrappedStr]
}
