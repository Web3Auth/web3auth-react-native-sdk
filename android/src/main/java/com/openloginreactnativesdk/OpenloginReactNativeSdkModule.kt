package com.openloginreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.openlogin.core.OpenLogin
import java.lang.Exception
import java.util.*package com.openloginreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.openlogin.core.OpenLogin
import java.lang.Exception
import java.util.*
import com.facebook.react.bridge.WritableMap

import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.openlogin.core.types.LoginParams
import com.openlogin.core.types.OpenLoginOptions
import com.openlogin.core.types.OpenLoginResponse
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java8.util.concurrent.CompletableFuture

// Quick note on allowing RN Modules to receive Activity Events
// https://stackoverflow.com/questions/45744013/onnewintent-is-not-called-on-reactcontextbasejavamodule-react-native

class OpenloginReactNativeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "OpenloginReactNativeSdk"
  }

  private lateinit var openlogin: OpenLogin

  @ReactMethod
  fun init(params: ReadableMap, promise: Promise) = try {
    val clientId = params.getString("clientId") as String
    val network = params.getString("network") as String
    val redirectUrl = params.getString("redirectUrl")
    openlogin = OpenLogin(
      OpenLoginOptions(
        context = currentActivity!!,
        clientId = clientId,
        network = OpenLogin.Network.valueOf(network.toUpperCase(Locale.ROOT)),
        redirectUrl = Uri.parse(redirectUrl ?: "${reactApplicationContext!!.packageName}://auth")
      )
    )

    openlogin.setResultUrl(reactApplicationContext.currentActivity?.intent?.data)

    reactApplicationContext.addActivityEventListener(object : ActivityEventListener {
      override fun onActivityResult(p0: Activity?, p1: Int, p2: Int, p3: Intent?) {}

      override fun onNewIntent(p0: Intent?) {
               openlogin.setResultUrl(p0?.data)
      }
    })
    promise.resolve(null)
  } catch (e: Exception) {
    promise.reject(e)
  }

  @ReactMethod
  fun login(params: ReadableMap, promise: Promise) {
    val provider = params.getString("provider") as String?

    CoroutineScope(Dispatchers.Default).launch {
      try {
        val loginCF = openlogin.login(LoginParams(getOpenLoginProvider(provider)))
        loginCF.join()
        loginCF.whenComplete { result, error ->
          launch(Dispatchers.Main) {
            if (error != null) {
              promise.reject(error)
            } else {
              val map = Arguments.createMap()
              map.putString("privKey", result.privKey)
              val userInfoMap = Arguments.createMap()
              userInfoMap.putString("email", result.userInfo?.email)
              userInfoMap.putString("name", result.userInfo?.name)
              userInfoMap.putString("profileImage", result.userInfo?.profileImage)
              userInfoMap.putString("aggregateVerifier", result.userInfo?.aggregateVerifier)
              userInfoMap.putString("verifier", result.userInfo?.verifier)
              userInfoMap.putString("verifierId", result.userInfo?.verifierId)
              userInfoMap.putString("typeOfLogin", result.userInfo?.typeOfLogin)
              map.putMap("userInfo", userInfoMap)
              promise.resolve(map)
            }
          }
        }
      } catch (e: Exception) {
        launch(Dispatchers.Main) { promise.reject(e) }
      }
    }
  }

      @ReactMethod
      fun logout(params: ReadableMap, promise: Promise) {
        CoroutineScope(Dispatchers.Default).launch {
          try {
            val logoutCF = openlogin.logout()
            logoutCF.join()
            logoutCF.whenComplete { _, error ->
              launch(Dispatchers.Main) {
                if (error != null) {
                  promise.reject(error)
                } else {
                  promise.resolve(null)
                }
              }
            }
          } catch (e: Exception) {
            launch(Dispatchers.Main) { promise.reject(e) }
          }
        }
      }

      fun getOpenLoginProvider(provider: String?): OpenLogin.Provider {
        return when (provider) {
          "google" -> OpenLogin.Provider.GOOGLE
          "facebook" -> OpenLogin.Provider.FACEBOOK
          "reddit" -> OpenLogin.Provider.REDDIT
          "discord" -> OpenLogin.Provider.DISCORD
          "twitch" -> OpenLogin.Provider.TWITCH
          "apple" -> OpenLogin.Provider.APPLE
          "line" -> OpenLogin.Provider.LINE
          "github" -> OpenLogin.Provider.GITHUB
          "kakao" -> OpenLogin.Provider.KAKAO
          "linkedin" -> OpenLogin.Provider.LINKEDIN
          "twitter" -> OpenLogin.Provider.TWITTER
          "weibo" -> OpenLogin.Provider.WEIBO
          "wechat" -> OpenLogin.Provider.WECHAT
          "email_passwordless" -> OpenLogin.Provider.EMAIL_PASSWORDLESS

          else -> OpenLogin.Provider.GOOGLE
        }
      }

}

import com.facebook.react.bridge.WritableMap

import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.openlogin.core.types.LoginParams
import com.openlogin.core.types.OpenLoginOptions
import com.openlogin.core.types.OpenLoginResponse
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java8.util.concurrent.CompletableFuture

// Quick note on allowing RN Modules to receive Activity Events
// https://stackoverflow.com/questions/45744013/onnewintent-is-not-called-on-reactcontextbasejavamodule-react-native

class OpenloginReactNativeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "OpenloginReactNativeSdk"
  }

  private lateinit var openlogin: OpenLogin

  @ReactMethod
  fun init(params: ReadableMap, promise: Promise) = try {
    val clientId = params.getString("clientId") as String
    val network = params.getString("network") as String
    val redirectUrl = params.getString("redirectUrl")
    openlogin = OpenLogin(
      OpenLoginOptions(
        context = currentActivity!!,
        clientId = clientId,
        network = OpenLogin.Network.valueOf(network.toUpperCase(Locale.ROOT)),
        redirectUrl = Uri.parse(redirectUrl ?: "${reactApplicationContext!!.packageName}://auth")
      )
    )

    openlogin.setResultUrl(reactApplicationContext.currentActivity?.intent?.data)

    reactApplicationContext.addActivityEventListener(object : ActivityEventListener {
      override fun onActivityResult(p0: Activity?, p1: Int, p2: Int, p3: Intent?) {}

      override fun onNewIntent(p0: Intent?) {
               openlogin.setResultUrl(p0?.data)
      }
    })
    promise.resolve(null)
  } catch (e: Exception) {
    promise.reject(e)
  }

  @ReactMethod
  fun login(params: ReadableMap, promise: Promise) {
    val provider = params.getString("provider") as String

    CoroutineScope(Dispatchers.Default).launch {
      try {
        val loginCF = openlogin.login(LoginParams(getOpenLoginProvider(provider)))
        loginCF.join()
        loginCF.whenComplete { result, error ->
          launch(Dispatchers.Main) {
            if (error != null) {
              promise.reject(error)
            } else {
              val map = Arguments.createMap()
              map.putString("privKey", result.privKey)
              val userInfoMap = Arguments.createMap()
              userInfoMap.putString("email", result.userInfo?.email)
              userInfoMap.putString("name", result.userInfo?.name)
              userInfoMap.putString("profileImage", result.userInfo?.profileImage)
              userInfoMap.putString("aggregateVerifier", result.userInfo?.aggregateVerifier)
              userInfoMap.putString("verifier", result.userInfo?.verifier)
              userInfoMap.putString("verifierId", result.userInfo?.verifierId)
              userInfoMap.putString("typeOfLogin", result.userInfo?.typeOfLogin)
              map.putMap("userInfo", userInfoMap)
              promise.resolve(map)
            }
          }
        }
      } catch (e: Exception) {
        launch(Dispatchers.Main) { promise.reject(e) }
      }
    }
  }

      @ReactMethod
      fun logout(params: ReadableMap, promise: Promise) {
        CoroutineScope(Dispatchers.Default).launch {
          try {
            val logoutCF = openlogin.logout()
            logoutCF.join()
            logoutCF.whenComplete { _, error ->
              launch(Dispatchers.Main) {
                if (error != null) {
                  promise.reject(error)
                } else {
                  promise.resolve(null)
                }
              }
            }
          } catch (e: Exception) {
            launch(Dispatchers.Main) { promise.reject(e) }
          }
        }
      }

      fun getOpenLoginProvider(provider: String): OpenLogin.Provider {
        return when (provider) {
          "google" -> OpenLogin.Provider.GOOGLE
          "facebook" -> OpenLogin.Provider.FACEBOOK
          "reddit" -> OpenLogin.Provider.REDDIT
          "discord" -> OpenLogin.Provider.DISCORD
          "twitch" -> OpenLogin.Provider.TWITCH
          "apple" -> OpenLogin.Provider.APPLE
          "line" -> OpenLogin.Provider.LINE
          "github" -> OpenLogin.Provider.GITHUB
          "kakao" -> OpenLogin.Provider.KAKAO
          "linkedin" -> OpenLogin.Provider.LINKEDIN
          "twitter" -> OpenLogin.Provider.TWITTER
          "weibo" -> OpenLogin.Provider.WEIBO
          "wechat" -> OpenLogin.Provider.WECHAT
          "email_passwordless" -> OpenLogin.Provider.EMAIL_PASSWORDLESS

          else -> OpenLogin.Provider.GOOGLE
        }
      }

}
