# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# --- Stashly ---
# React Native / Hermes core
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
# JSI / native-backed libraries (they look classes up by name from C++)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.op.sqlite.** { *; }
-keep class com.margelo.nitro.** { *; }
-keep class com.mrousavy.mmkv.** { *; }
-keep class com.alpha0010.fs.** { *; }
-keep class com.reactnativedocumentpicker.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.mkuczera.** { *; }
-keep class com.reactnativepagerview.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.facebook.react.**
