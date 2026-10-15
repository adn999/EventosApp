package mx.org.scouts.eventos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget "Accesos rápidos": KPIs del evento (los deja la app) y botones a Registro, Kit y Consulta.
 * Los toques abren la app con enlaces eventosscouts://… (los atiende EnlacesService en la web).
 */
public class AccesosWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    /** Redibuja todos los widgets colocados (la app lo llama al guardar números nuevos). */
    static void actualizarTodos(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AccesosWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    private static PendingIntent enlace(Context context, String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setClass(context, MainActivity.class);
        return PendingIntent.getActivity(context, url.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Pone la cifra dentro del anillo achicando la letra según su ancho (~34 dp útiles) para que no toque el trazo. */
    static void valor(RemoteViews v, int id, String texto) { valor(v, id, texto, 1f); }

    static void valor(RemoteViews v, int id, String texto, float escala) {
        float em = 0;
        for (char c : texto.toCharArray()) em += Character.isDigit(c) ? 0.6f : 0.3f;
        float sp = Math.min(17f, 34f / Math.max(em, 1f)) * escala;
        v.setTextViewText(id, texto);
        v.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_SP, sp);
    }

    /** Anillo de progreso de 52 dp; con total 0 (Comidas, sin meta) sale completo si hay valor y vacío si no. */
    private static Bitmap anillo(Context context, int valor, int total, int color) {
        return anillo(context, valor, total, color, 52, 6);
    }

    /** Igual, con tamaño y grosor del trazo en dp (lo usa también el widget pequeño). */
    static Bitmap anillo(Context context, int valor, int total, int color, int ladoDp, int trazoDp) {
        float d = context.getResources().getDisplayMetrics().density;
        int lado = Math.round(ladoDp * d);
        float trazo = trazoDp * d;
        Bitmap bmp = Bitmap.createBitmap(lado, lado, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint pintura = new Paint(Paint.ANTI_ALIAS_FLAG);
        pintura.setStyle(Paint.Style.STROKE);
        pintura.setStrokeWidth(trazo);
        pintura.setStrokeCap(Paint.Cap.ROUND);
        RectF caja = new RectF(trazo / 2, trazo / 2, lado - trazo / 2, lado - trazo / 2);
        pintura.setColor(Color.argb(46, Color.red(color), Color.green(color), Color.blue(color)));
        c.drawArc(caja, 0, 360, false, pintura);
        float avance = total > 0 ? Math.min(valor / (float) total, 1f) : (valor > 0 ? 1f : 0f);
        pintura.setColor(color);
        if (avance > 0) c.drawArc(caja, -90, 360 * avance, false, pintura);
        return bmp;
    }

    private static RemoteViews construir(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_accesos);
        NumberFormat n = NumberFormat.getIntegerInstance(Locale.getDefault());
        SharedPreferences p = context.getSharedPreferences(ResumenWidgetPlugin.PREFS, Context.MODE_PRIVATE);

        if (p.contains("actualizado")) {
            v.setViewVisibility(R.id.fila_kpis, View.VISIBLE);
            v.setViewVisibility(R.id.sin_datos, View.GONE);
            valor(v, R.id.asistencia_valor, n.format(p.getInt("asistencia", 0)));
            v.setTextViewText(R.id.asistencia_total, "de " + n.format(p.getInt("registros", 0)));
            valor(v, R.id.kits_valor, n.format(p.getInt("kitEntregados", 0)));
            v.setTextViewText(R.id.kits_total, "de " + n.format(p.getInt("kitIncluye", 0)));
            valor(v, R.id.comidas_valor, n.format(p.getInt("comidasEntregadas", 0)));
            v.setImageViewBitmap(R.id.asistencia_anillo, anillo(context, p.getInt("asistencia", 0), p.getInt("registros", 0), 0xFF4E6129));
            v.setImageViewBitmap(R.id.kits_anillo, anillo(context, p.getInt("kitEntregados", 0), p.getInt("kitIncluye", 0), 0xFF347D5F));
            v.setImageViewBitmap(R.id.comidas_anillo, anillo(context, p.getInt("comidasEntregadas", 0), 0, 0xFFAF591C));   // sin total: completo si hay entregas
            String evento = p.getString("macroEvento", "");
            String hora = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(p.getLong("actualizado", 0)));
            v.setTextViewText(R.id.pie, (evento.isEmpty() ? "" : evento + " · ") + "actualizado " + hora);
            v.setViewVisibility(R.id.pie_fila, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.fila_kpis, View.GONE);
            v.setViewVisibility(R.id.pie_fila, View.GONE);
            v.setViewVisibility(R.id.sin_datos, View.VISIBLE);
        }

        v.setOnClickPendingIntent(R.id.zona_kpis, enlace(context, "eventosscouts://kpis"));
        v.setOnClickPendingIntent(R.id.boton_registro, enlace(context, "eventosscouts://registro"));
        v.setOnClickPendingIntent(R.id.boton_kit, enlace(context, "eventosscouts://kit"));
        v.setOnClickPendingIntent(R.id.boton_consulta, enlace(context, "eventosscouts://consulta"));
        return v;
    }
}
