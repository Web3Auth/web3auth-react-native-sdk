import OpenLogin

let OpenloginAuthStateChangedEvent = "OpenloginAuthStateChangedEvent"

@available(iOS 13.0, *)
@objc(OpenloginReactNativeSdk)
class OpenloginReactNativeSdk: RCTEventEmitter {
    
    override init() {
        super.init()
    }
    
    private var webauth: WebAuth?


    
    @objc(init:withResolver:withRejecter:)
    func `init`(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        guard
            let clientId: String = params["clientId"],
            let networkString: String = params["network"],
            let network = Network(rawValue: networkString)
        else {
            reject("ArgumentError", "invalid clientId or network", nil)
            return
        }
        webauth = OpenLogin.webAuth(clientId: clientId, network: network)
        resolve(nil)
    }
    
    @objc(login:withResolver:withRejecter:)
    func login(params: [String:String], resolve: @escaping RCTPromiseResolveBlock,reject: @escaping RCTPromiseRejectBlock) -> Void {
        if let wa = webauth {
            wa.start {
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
        } else {
            reject("InitError", "init has not been called yet", nil)
        }
    }
    
    @objc(logout:withResolver:withRejecter:)
    func logout(params: [String:String], resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        if let wa = webauth {
            wa.signOut()
        } else {
            reject("InitError", "init has not been called yet", nil)
        }
        resolve(nil)
    }
    
    @objc open override func supportedEvents() -> [String]{
        return [OpenloginAuthStateChangedEvent]
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        true
    }
}
