#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(OpenloginReactNativeSdk, NSObject)

RCT_EXTERN_METHOD(init: (NSDictionary *)params
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
                  
RCT_EXTERN_METHOD(login: (NSDictionary *)params
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(logout: (NSDictionary *)params
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

@end
