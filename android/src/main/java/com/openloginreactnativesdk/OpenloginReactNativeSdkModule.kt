package com.openloginreactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import android.app.Activity
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.web3auth.core.Web3Auth
import java.lang.Exception
import java.util.*
import com.facebook.react.bridge.WritableMap

import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.web3auth.core.types.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java8.util.concurrent.CompletableFuture

// Quick note on allowing RN Modules to receive Activity Events
// https://stackoverflow.com/questions/45744013/onnewintent-is-not-called-on-reactcontextbasejavamodule-react-native

class OpenloginReactNativeSdkModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "OpenloginReactNativeSdk"
  }

  private lateinit var openlogin: Web3Auth

  @ReactMethod
  fun init(params: ReadableMap, promise: Promise) = try {
    val clientId = params.getString("clientId") as String
    val network = params.getString("network") as String
    val redirectUrl = params.getString("redirectUrl")
    openlogin = Web3Auth(
      Web3AuthOptions(
        context = currentActivity!!,
        clientId = clientId,
        network = Web3Auth.Network.valueOf(network.toUpperCase(Locale.ROOT)),
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
        val loginParams = LoginParams(
          loginProvider = getWeb3AuthProvider(provider),
          relogin = if (!params.hasKey("relogin")) null else params.getBoolean("relogin"),
          dappShare = if (!params.hasKey("dappShare")) null else params.getString("dappShare"),
          redirectUrl = if (!params.hasKey("redirectUrl")) null else Uri.parse(params.getString("redirectUrl")),
          appState = if (!params.hasKey("appState")) null else params.getString("appState"),
          extraLoginOptions = ExtraLoginOptions(
            login_hint = if (params.hasKey("extraLoginOptions") || params.getMap("extraLoginOptions")
                ?.hasKey("login_hint") == null || params.getMap("extraLoginOptions")
                ?.hasKey("login_hint") == true
            ) params.getMap("extraLoginOptions")?.getString("login_hint") else null

          )
        )
        val loginCF = openlogin.login(
          loginParams,
        )
        loginCF.join()
        loginCF.whenComplete { result, error ->
          launch(Dispatchers.Main) {
            if (error != null) {
              promise.reject(error)
            } else {
              val map = Arguments.createMap()
              map.putString("privKey", result.privKey)
              map.putString("ed25519PrivKey", result.ed25519PrivKey)
              val userInfoMap = Arguments.createMap()
              userInfoMap.putString("email", result.userInfo?.email)
              userInfoMap.putString("name", result.userInfo?.name)
              userInfoMap.putString("profileImage", result.userInfo?.profileImage)
              userInfoMap.putString("aggregateVerifier", result.userInfo?.aggregateVerifier)
              userInfoMap.putString("verifier", result.userInfo?.verifier)
              userInfoMap.putString("verifierId", result.userInfo?.verifierId)
              userInfoMap.putString("typeOfLogin", result.userInfo?.typeOfLogin)
              userInfoMap.putString("dappShare", result.userInfo?.dappShare)
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

  fun getWeb3AuthProvider(provider: String?): Provider {
    return when (provider) {
      "google" -> Provider.GOOGLE
      "facebook" -> Provider.FACEBOOK
      "reddit" -> Provider.REDDIT
      "discord" -> Provider.DISCORD
      "twitch" -> Provider.TWITCH
      "apple" -> Provider.APPLE
      "line" -> Provider.LINE
      "github" -> Provider.GITHUB
      "kakao" -> Provider.KAKAO
      "linkedin" -> Provider.LINKEDIN
      "twitter" -> Provider.TWITTER
      "weibo" -> Provider.WEIBO
      "wechat" -> Provider.WECHAT
      "email_passwordless" -> Provider.EMAIL_PASSWORDLESS

      else -> Provider.GOOGLE
    }
  }

}

