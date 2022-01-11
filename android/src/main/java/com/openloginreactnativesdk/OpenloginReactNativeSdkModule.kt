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
import java.util.*
import com.facebook.react.bridge.WritableMap

import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.openlogin.core.AuthStateChangeListener

// Quick note on allowing RN Modules to receive Activity Events
// https://stackoverflow.com/questions/45744013/onnewintent-is-not-called-on-reactcontextbasejavamodule-react-native

class OpenloginReactNativeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "OpenloginReactNativeSdk"
  }

  private fun sendEvent(reactContext: ReactContext,
                        eventName: String,
                        params: WritableMap?) {
    reactContext
      .getJSModule(RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private lateinit var openlogin: OpenLogin

  @ReactMethod
  fun init(params: ReadableMap, promise: Promise) = try {
    val clientId = params.getString("clientId") as String
    val network = params.getString("network") as String
    val redirectUrl = params.getString("redirectUrl")
    openlogin = OpenLogin(
      context = currentActivity!!,
      clientId = clientId,
      network = OpenLogin.Network.valueOf(network.toUpperCase(Locale.ROOT)),
      redirectUrl = Uri.parse(redirectUrl ?: "${reactApplicationContext!!.packageName}://auth")
    )
    openlogin.addAuthStateChangeListener(AuthStateChangeListener {
      val map = Arguments.createMap()
      map.putString("privKey", it.privKey)
      val userInfoMap = Arguments.createMap()
      userInfoMap.putString("email", it.userInfo?.email)
      userInfoMap.putString("name", it.userInfo?.name)
      userInfoMap.putString("profileImage", it.userInfo?.profileImage)
      userInfoMap.putString("aggregateVerifier", it.userInfo?.aggregateVerifier)
      userInfoMap.putString("verifier", it.userInfo?.verifier)
      userInfoMap.putString("verifierId", it.userInfo?.verifierId)
      userInfoMap.putString("typeOfLogin", it.userInfo?.typeOfLogin)
      map.putMap("userInfo", userInfoMap)

      sendEvent(reactApplicationContext, "OpenloginAuthStateChangedEvent", map)
    })

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
  fun login(params: ReadableMap, promise: Promise) = try {
    val provider = params.getString("provider") as String
    openlogin.login(loginProvider = OpenLogin.Provider.valueOf(provider.toUpperCase(Locale.ROOT)))
    promise.resolve(null)
  } catch (e: Exception) {
    promise.reject(e)
  }

  @ReactMethod
  fun logout(params: ReadableMap, promise: Promise) = try {
    openlogin.logout()
    promise.resolve(null)
  } catch (e: Exception) {
    promise.reject(e)
  }

}
