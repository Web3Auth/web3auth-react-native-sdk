import OpenLogin

let OpenloginAuthStateChangedEvent = "OpenloginAuthStateChangedEvent"

@objc(OpenloginReactNativeSdk)
class OpenloginReactNativeSdk: RCTEventEmitter {
    
    private var webauth: WebAuth


    
    @objc(init:withResolver:withRejecter:)
    func `init`(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        guard
            let clientId = params["clientId"] as? String,
            let networkString = params["network"] as? String,
            let network = Network(rawValue: networkString)
        else {
            reject("ArgumentError", "invalid clientId or network", nil)
            return
        }
        webauth = OpenLogin.webAuth(clientId, network)
        resolve(nil)
    }
    
    @objc(login:withResolver:withRejecter:)
    func login(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        webauth.start {
            switch $0 {
            case .success(let result):
                let m: [String: Any] = [
                    "privKey": result.privKey,
                    "userInfo": [
                        "name": result.userInfo.name,
                        "profileImage": result.userInfo.profileImage,
                        "typeOfLogin": result.userInfo.typeOfLogin
                    ]
                ]
                self.sendEvent(withName: OpenloginAuthStateChangedEvent, body: m)
                resolve(nil)
            case .failure(let error):
                reject("LoginError", "Error occured during login with openlogin-swift-sdk", error)
            }
        }
    }
    
    @objc(logout:withResolver:withRejecter:)
    func logout(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        webauth.singOut()
        resolve(nil)
    }
    
    @objc open override func supportedEvents() -> [String]{
        return [OpenloginReactNativeSdk]
    }
}
