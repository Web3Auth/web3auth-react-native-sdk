import OpenLogin

@available(iOS 13.0, *)
@objc(OpenloginReactNativeSdk)
class OpenloginReactNativeSdk: NSObject {
    
    private var openlogin: OpenLogin?
    
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
        openlogin = OpenLogin(OLInitParams(clientId: clientId, network: network))
        resolve(nil)
    }
    
    @objc(login:withResolver:withRejecter:)
    func login(params: [String: String], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
        let provider = getOpenLoginProvider(params["provider"])
        if let ol = openlogin {
            ol.login(OLLoginParams(provider: provider)) {
                switch $0 {
                case .success(let result):
                    let m: [String: Any] = [
                        "privKey": result.privKey,
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
                    reject("LoginError", "Error occured during login with openlogin-swift-sdk", error)
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

func getOpenLoginProvider(_ str: String?) -> OpenLoginProvider?{
    guard
        let unwrappedStr = str
    else {
        return nil
    }
    let mapping: [String: OpenLoginProvider] = [
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
