# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
-renamesourcefileattribute SourceFile

# Capacitor lee por reflexión las anotaciones @CapacitorPlugin/@Permission. Sin estas reglas, R8 (modo completo)
# supone que PluginHandle.getPluginAnnotation() siempre es null y elimina la lectura de permisos: checkPermissions()
# devuelve vacío en todos los plugins y CodigoBarras.iniciarContinuo se queda sin responder (v1.0.1).
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keep @interface com.getcapacitor.annotation.** { *; }
-keep class com.getcapacitor.** { *; }

# Plugins y widgets locales de la app (CodigoBarrasPlugin, ResumenWidgetPlugin, ...)
-keep class mx.org.scouts.eventos.** { *; }
