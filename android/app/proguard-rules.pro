# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
-keep class com.yalantis.ucrop.** { *; }
-keep interface com.yalantis.ucrop.** { *; }
-keep class androidx.appcompat.** { *; } 
-dontwarn com.yalantis.ucrop.**
-keep class com.reactnativeimagecolors.** { *; }
-keep class androidx.palette.** { *; }
-keep class kotlin.** { *; }
-keep class kotlinx.coroutines.** { *; }
-keep class androidx.core.graphics.** { *; }
-dontwarn com.reactnativeimagecolors.**
-dontwarn androidx.palette.**
