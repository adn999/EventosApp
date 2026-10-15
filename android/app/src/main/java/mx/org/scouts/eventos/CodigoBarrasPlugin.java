package mx.org.scouts.eventos;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.Image;
import android.os.Handler;
import android.os.Looper;
import android.util.Size;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.core.ZoomState;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.core.resolutionselector.ResolutionStrategy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Escaneo continuo en Android, equivalente a CodigoBarras.swift: la cámara (CameraX + ML Kit) queda abierta encima de la
 * vista web y cada código Code 128 / Code 39 se emite como "codigoContinuo" { valor }. La web contesta con
 * mostrarResultado({ tipo: ok|ya|error, titulo, detalle }) y la tarjeta lo muestra sin cerrar la cámara.
 * Al cerrarla el usuario (Terminar o atrás) se emite "continuoCerrado".
 * La cámara es una vista sobre la misma Activity, no otra Activity, para que el JavaScript siga corriendo debajo.
 * La lectura de un solo código sigue usando el escáner de Google (escaner.ts).
 */
@CapacitorPlugin(name = "CodigoBarras", permissions = @Permission(strings = { Manifest.permission.CAMERA }, alias = "camara"))
public class CodigoBarrasPlugin extends Plugin {
    private Escaner continuo;

    @PluginMethod
    public void iniciarContinuo(PluginCall call) {
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            call.reject("Este dispositivo no tiene cámara", "NO_DISPONIBLE");
            return;
        }
        if (getPermissionState("camara") != PermissionState.GRANTED) requestPermissionForAlias("camara", call, "permisoCamara");
        else abrir(call);
    }

    @PermissionCallback
    private void permisoCamara(PluginCall call) {
        if (getPermissionState("camara") == PermissionState.GRANTED) abrir(call);
        else call.reject("Sin permiso de cámara", "PERMISO");
    }

    private void abrir(PluginCall call) {
        String titulo = call.getString("titulo", "Escaneo continuo");
        getActivity().runOnUiThread(() -> {
            if (continuo != null) continuo.cerrar();
            continuo = new Escaner(getActivity(), titulo);
            continuo.mostrar();
            call.resolve();
        });
    }

    @PluginMethod
    public void mostrarResultado(PluginCall call) {
        String tipo = call.getString("tipo", "error");
        String titulo = call.getString("titulo", "");
        String detalle = call.getString("detalle", "");
        getActivity().runOnUiThread(() -> {
            if (continuo != null) continuo.mostrarResultado(tipo, titulo, detalle);
            call.resolve();
        });
    }

    @PluginMethod
    public void detenerContinuo(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (continuo != null) continuo.cerrar();
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (continuo != null) continuo.cerrar();
    }

    /** Vista de cámara a pantalla completa con título, contador, tarjeta de resultado, Limpiar, Terminar y linterna. */
    private final class Escaner {
        private final AppCompatActivity act;
        private final String titulo;
        private final Handler main = new Handler(Looper.getMainLooper());
        private final ExecutorService analisis = Executors.newSingleThreadExecutor();
        private final BarcodeScanner lector = BarcodeScanning.getClient(new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39).build());

        private FrameLayout raiz;
        private PreviewView vista;
        private ProcessCameraProvider proveedor;
        private Camera camara;
        private OnBackPressedCallback atras;
        private boolean terminado = false;
        private boolean linternaEncendida = false;

        // Uno a la vez: no se lee otro código hasta tener el resultado del anterior
        private volatile boolean esperando = false;
        private String ultimoValor = "";
        private long ultimaLectura = 0;
        private int correctos = 0;
        private final Runnable limiteEspera = () -> mostrarResultado("error", "Sin respuesta", "Revisa la conexión e intenta de nuevo");
        private final Runnable liberar = () -> esperando = false;

        private TextView contador, icono, codigoResultado, tituloResultado, detalleResultado;
        private ImageView linterna;
        private LinearLayout tarjeta;

        Escaner(AppCompatActivity act, String titulo) {
            this.act = act;
            this.titulo = titulo;
        }

        void mostrar() {
            raiz = new FrameLayout(act);
            raiz.setBackgroundColor(Color.BLACK);
            raiz.setClickable(true);       // los toques no llegan a la vista web de abajo
            raiz.setFocusable(true);

            vista = new PreviewView(act);
            vista.setScaleType(PreviewView.ScaleType.FILL_CENTER);
            raiz.addView(vista, new FrameLayout.LayoutParams(-1, -1));

            LinearLayout arriba = new LinearLayout(act);
            arriba.setOrientation(LinearLayout.VERTICAL);
            arriba.setGravity(Gravity.CENTER_HORIZONTAL);
            TextView texto = etiqueta(titulo, 16, Typeface.BOLD);
            texto.setBackground(fondo(Color.argb(115, 0, 0, 0), 14));
            texto.setPadding(dp(18), dp(7), dp(18), dp(7));
            arriba.addView(texto, new LinearLayout.LayoutParams(dp(300), -2));
            contador = etiqueta("", 15, Typeface.BOLD);
            contador.setBackground(fondo(Color.argb(190, 52, 199, 89), 14));
            contador.setPadding(dp(14), dp(4), dp(14), dp(4));
            contador.setMinWidth(dp(120));
            contador.setVisibility(View.GONE);
            LinearLayout.LayoutParams lpc = new LinearLayout.LayoutParams(-2, -2);
            lpc.topMargin = dp(10);
            arriba.addView(contador, lpc);
            FrameLayout.LayoutParams lpa = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
            lpa.topMargin = dp(16);
            raiz.addView(arriba, lpa);

            LinearLayout abajo = new LinearLayout(act);
            abajo.setOrientation(LinearLayout.VERTICAL);
            abajo.addView(crearTarjeta(), margenes(new LinearLayout.LayoutParams(-1, -2), 16, 0, 16, 18));
            // Limpiar · Terminar · linterna, centrados
            LinearLayout botones = new LinearLayout(act);
            botones.setOrientation(LinearLayout.HORIZONTAL);
            botones.setGravity(Gravity.CENTER);
            TextView limpiar = etiqueta("Limpiar", 17, Typeface.BOLD);
            limpiar.setBackground(fondo(Color.argb(140, 0, 0, 0), 24));
            limpiar.setOnClickListener(v -> limpiar());
            botones.addView(limpiar, new LinearLayout.LayoutParams(dp(120), dp(48)));
            TextView terminar = etiqueta("Terminar", 17, Typeface.BOLD);
            terminar.setBackground(fondo(Color.argb(140, 0, 0, 0), 24));
            terminar.setOnClickListener(v -> cerrar());
            botones.addView(terminar, margenes(new LinearLayout.LayoutParams(dp(140), dp(48)), 12, 0, 0, 0));
            linterna = new ImageView(act);
            linterna.setImageResource(R.drawable.ic_linterna);
            linterna.setPadding(dp(12), dp(12), dp(12), dp(12));
            linterna.setBackground(fondo(Color.argb(140, 0, 0, 0), 24));
            linterna.setContentDescription("Linterna");
            linterna.setOnClickListener(v -> alternarLinterna());
            linterna.setVisibility(View.GONE);
            pintarLinterna();
            botones.addView(linterna, margenes(new LinearLayout.LayoutParams(dp(48), dp(48)), 12, 0, 0, 0));
            abajo.addView(botones, new LinearLayout.LayoutParams(-1, dp(48)));
            FrameLayout.LayoutParams lpb = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
            lpb.bottomMargin = dp(24);
            raiz.addView(abajo, lpb);

            // La app dibuja detrás de las barras del sistema (edge-to-edge): los controles respetan su espacio
            ViewCompat.setOnApplyWindowInsetsListener(raiz, (v, insets) -> {
                Insets b = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                arriba.setPadding(b.left, b.top, b.right, 0);
                abajo.setPadding(b.left, 0, b.right, b.bottom);
                return insets;
            });

            gestos();
            pintarTarjeta("⌖", Color.WHITE, "Listo para escanear", "Apunta a la pulsera o al CUM");

            ((ViewGroup) act.findViewById(android.R.id.content)).addView(raiz, new FrameLayout.LayoutParams(-1, -1));
            ViewCompat.requestApplyInsets(raiz);
            raiz.setAlpha(0f);
            raiz.animate().alpha(1f).setDuration(200).start();

            atras = new OnBackPressedCallback(true) {
                @Override public void handleOnBackPressed() { cerrar(); }
            };
            act.getOnBackPressedDispatcher().addCallback(act, atras);

            iniciarCamara();
        }

        private void iniciarCamara() {
            ListenableFuture<ProcessCameraProvider> futuro = ProcessCameraProvider.getInstance(act);
            futuro.addListener(() -> {
                if (terminado) return;
                try {
                    proveedor = futuro.get();
                    Preview preview = new Preview.Builder().build();
                    preview.setSurfaceProvider(vista.getSurfaceProvider());
                    // 1080p: las barras delgadas de las pulseras necesitan resolución
                    ResolutionSelector resolucion = new ResolutionSelector.Builder()
                            .setResolutionStrategy(new ResolutionStrategy(new Size(1920, 1080),
                                    ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)).build();
                    ImageAnalysis analizador = new ImageAnalysis.Builder()
                            .setResolutionSelector(resolucion)
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build();
                    analizador.setAnalyzer(analisis, this::analizar);
                    proveedor.unbindAll();
                    camara = proveedor.bindToLifecycle(act, CameraSelector.DEFAULT_BACK_CAMERA, preview, analizador);
                    if (camara.getCameraInfo().hasFlashUnit()) linterna.setVisibility(View.VISIBLE);
                } catch (Exception e) {
                    pintarTarjeta("✕", Color.rgb(255, 59, 48), "No se pudo abrir la cámara", "Usa el modo Teclado");
                }
            }, ContextCompat.getMainExecutor(act));
        }

        @OptIn(markerClass = ExperimentalGetImage.class)
        private void analizar(ImageProxy cuadro) {
            Image imagen = cuadro.getImage();
            if (imagen == null || esperando || terminado) { cuadro.close(); return; }
            lector.process(InputImage.fromMediaImage(imagen, cuadro.getImageInfo().getRotationDegrees()))
                    .addOnSuccessListener(ContextCompat.getMainExecutor(act), codigos -> {
                        for (Barcode c : codigos) {
                            String valor = c.getRawValue();
                            if (valor != null && !valor.isEmpty()) { leido(valor); break; }
                        }
                    })
                    .addOnCompleteListener(t -> cuadro.close());
        }

        /** Hilo principal. La misma pulsera no se repite si sigue frente a la cámara. */
        private void leido(String valor) {
            long ahora = System.currentTimeMillis();
            if (terminado || esperando || (valor.equals(ultimoValor) && ahora - ultimaLectura < 4000)) return;
            esperando = true;
            ultimoValor = valor;
            ultimaLectura = ahora;
            codigoResultado.setText("Escaneado: " + valor);
            codigoResultado.setVisibility(View.VISIBLE);
            pintarTarjeta("⌛", Color.WHITE, "Consultando…", "");
            // Si la web no contesta, se libera la cámara para no quedarse trabada
            main.postDelayed(limiteEspera, 12000);
            JSObject datos = new JSObject();
            datos.put("valor", valor);
            notifyListeners("codigoContinuo", datos);
        }

        /** Resultado que manda la web para el código en proceso; tras una pausa corta se puede leer el siguiente. */
        void mostrarResultado(String tipo, String titulo, String detalle) {
            if (terminado) return;
            main.removeCallbacks(limiteEspera);
            switch (tipo) {
                case "ok":
                    correctos++;
                    contador.setText("✓ " + correctos + (correctos == 1 ? " lectura" : " lecturas"));
                    contador.setVisibility(View.VISIBLE);
                    pintarTarjeta("✓", Color.rgb(52, 199, 89), titulo, detalle);
                    break;
                case "ya":
                    pintarTarjeta("!", Color.rgb(255, 149, 0), titulo, detalle);
                    break;
                default:
                    pintarTarjeta("✕", Color.rgb(255, 59, 48), titulo, detalle);
            }
            tarjeta.animate().scaleX(1.03f).scaleY(1.03f).setDuration(120)
                    .withEndAction(() -> tarjeta.animate().scaleX(1f).scaleY(1f).setDuration(180).start()).start();
            main.removeCallbacks(liberar);
            main.postDelayed(liberar, 1000);
        }

        // MARK: tarjeta

        private View crearTarjeta() {
            tarjeta = new LinearLayout(act);
            tarjeta.setOrientation(LinearLayout.HORIZONTAL);
            tarjeta.setGravity(Gravity.CENTER_VERTICAL);
            tarjeta.setMinimumHeight(dp(86));
            tarjeta.setPadding(dp(18), dp(14), dp(18), dp(14));
            icono = etiqueta("", 22, Typeface.BOLD);
            icono.setGravity(Gravity.CENTER);
            tarjeta.addView(icono, new LinearLayout.LayoutParams(dp(38), dp(38)));
            LinearLayout textos = new LinearLayout(act);
            textos.setOrientation(LinearLayout.VERTICAL);
            tituloResultado = etiqueta("", 19, Typeface.BOLD);
            tituloResultado.setGravity(Gravity.START);
            tituloResultado.setMaxLines(2);
            detalleResultado = etiqueta("", 15, Typeface.NORMAL);
            detalleResultado.setGravity(Gravity.START);
            detalleResultado.setTextColor(Color.argb(217, 255, 255, 255));
            detalleResultado.setMaxLines(4);   // datos del usuario + sus eventos
            detalleResultado.setEllipsize(android.text.TextUtils.TruncateAt.END);
            // código leído: se queda junto al resultado hasta la siguiente lectura o hasta Limpiar
            codigoResultado = etiqueta("", 14, Typeface.BOLD);
            codigoResultado.setGravity(Gravity.START);
            codigoResultado.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
            codigoResultado.setTextColor(Color.argb(230, 255, 255, 255));
            codigoResultado.setVisibility(View.GONE);
            textos.addView(codigoResultado, margenes(new LinearLayout.LayoutParams(-2, -2), 0, 0, 0, 2));
            textos.addView(tituloResultado);
            textos.addView(detalleResultado, margenes(new LinearLayout.LayoutParams(-2, -2), 0, 3, 0, 0));
            tarjeta.addView(textos, margenes(new LinearLayout.LayoutParams(0, -2, 1), 14, 0, 0, 0));
            return tarjeta;
        }

        private void pintarTarjeta(String simbolo, int color, String titulo, String detalle) {
            icono.setText(simbolo);
            boolean neutro = color == Color.WHITE;
            icono.setTextColor(neutro ? Color.WHITE : Color.BLACK);
            icono.setBackground(neutro ? null : fondo(color, 19));
            tituloResultado.setText(titulo);
            detalleResultado.setText(detalle);
            detalleResultado.setVisibility(detalle.isEmpty() ? View.GONE : View.VISIBLE);
            // Fondo oscuro translúcido, teñido con el color del resultado (como el material de iOS)
            int base = Color.argb(200, 28, 28, 30);
            int fondoTarjeta = neutro ? base : mezclar(base, color, 0.28f);
            tarjeta.setBackground(fondo(fondoTarjeta, 26));
        }

        /** Quita de la tarjeta lo del último escaneo; la misma pulsera se puede volver a leer de inmediato. */
        private void limpiar() {
            if (terminado) return;
            ultimoValor = "";
            codigoResultado.setVisibility(View.GONE);
            pintarTarjeta("⌖", Color.WHITE, "Listo para escanear", "Apunta a la pulsera o al CUM");
        }

        // MARK: linterna, zoom y enfoque

        private void alternarLinterna() {
            if (camara == null || !camara.getCameraInfo().hasFlashUnit()) return;
            linternaEncendida = !linternaEncendida;
            camara.getCameraControl().enableTorch(linternaEncendida);
            pintarLinterna();
        }

        private void pintarLinterna() {
            linterna.setColorFilter(linternaEncendida ? Color.BLACK : Color.WHITE);
            linterna.setBackground(fondo(linternaEncendida ? Color.argb(217, 255, 204, 0) : Color.argb(140, 0, 0, 0), 24));
        }

        @SuppressLint("ClickableViewAccessibility")
        private void gestos() {
            ScaleGestureDetector pellizco = new ScaleGestureDetector(act, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
                @Override public boolean onScale(ScaleGestureDetector g) {
                    if (camara == null) return false;
                    ZoomState z = camara.getCameraInfo().getZoomState().getValue();
                    if (z == null) return false;
                    float nuevo = Math.max(1f, Math.min(z.getZoomRatio() * g.getScaleFactor(), Math.min(z.getMaxZoomRatio(), 6f)));
                    camara.getCameraControl().setZoomRatio(nuevo);
                    return true;
                }
            });
            vista.setOnTouchListener((v, e) -> {
                pellizco.onTouchEvent(e);
                if (e.getAction() == MotionEvent.ACTION_UP && !pellizco.isInProgress() && e.getPointerCount() == 1 && camara != null) {
                    FocusMeteringAction accion = new FocusMeteringAction.Builder(
                            vista.getMeteringPointFactory().createPoint(e.getX(), e.getY())).build();
                    camara.getCameraControl().startFocusAndMetering(accion);
                }
                return true;
            });
        }

        // MARK: cierre

        void cerrar() {
            if (terminado) return;
            terminado = true;
            main.removeCallbacks(limiteEspera);
            main.removeCallbacks(liberar);
            if (atras != null) atras.remove();
            if (camara != null && linternaEncendida) camara.getCameraControl().enableTorch(false);
            if (proveedor != null) proveedor.unbindAll();
            lector.close();
            analisis.shutdown();
            raiz.animate().alpha(0f).setDuration(180).withEndAction(() -> {
                ViewGroup padre = (ViewGroup) raiz.getParent();
                if (padre != null) padre.removeView(raiz);
            }).start();
            if (continuo == this) continuo = null;
            notifyListeners("continuoCerrado", new JSObject());
        }

        // MARK: utilidades

        private TextView etiqueta(String texto, int sp, int estilo) {
            TextView t = new TextView(act);
            t.setText(texto);
            t.setTextColor(Color.WHITE);
            if (sp > 0) t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
            t.setTypeface(Typeface.DEFAULT, estilo);
            t.setGravity(Gravity.CENTER);
            return t;
        }

        private GradientDrawable fondo(int color, int radioDp) {
            GradientDrawable g = new GradientDrawable();
            g.setColor(color);
            g.setCornerRadius(dp(radioDp));
            return g;
        }

        private LinearLayout.LayoutParams margenes(LinearLayout.LayoutParams lp, int l, int t, int r, int b) {
            lp.setMargins(dp(l), dp(t), dp(r), dp(b));
            return lp;
        }

        private int mezclar(int base, int color, float f) {
            return Color.argb(Color.alpha(base),
                    (int) (Color.red(base) * (1 - f) + Color.red(color) * f),
                    (int) (Color.green(base) * (1 - f) + Color.green(color) * f),
                    (int) (Color.blue(base) * (1 - f) + Color.blue(color) * f));
        }

        private int dp(float v) {
            return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, act.getResources().getDisplayMetrics()));
        }
    }
}
