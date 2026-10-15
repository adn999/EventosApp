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
import android.graphics.Paint;
import android.graphics.Path;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Widget mediano: línea con el avance del evento cada 12 horas. Toma la serie que deja la app (ResumenWidgetPlugin.guardarDia)
 * y al tocarlo abre la pantalla de indicadores (eventosscouts://kpis).
 */
public class AvanceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    /** Redibuja todos los widgets de avance colocados (la app lo llama al guardar la serie nueva). */
    static void actualizarTodos(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AvanceWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    private static RemoteViews construir(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_avance);
        SharedPreferences p = context.getSharedPreferences(ResumenWidgetPlugin.PREFS, Context.MODE_PRIVATE);
        String json = p.getString("avanceDia", null);
        boolean hay = false;
        if (json != null) {
            try {
                JSONArray dias = new JSONArray(json);
                if (dias.length() > 0) {
                    v.setImageViewBitmap(R.id.grafica, barras(context, dias));
                    hay = true;
                }
            } catch (Exception e) { /* serie dañada: se muestra el aviso */ }
        }
        v.setViewVisibility(R.id.contenido, hay ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.sin_datos, hay ? View.GONE : View.VISIBLE);

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("eventosscouts://kpis"));
        intent.setClass(context, MainActivity.class);
        v.setOnClickPendingIntent(R.id.raiz, PendingIntent.getActivity(context, 8, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }

    private static Bitmap barras(Context context, JSONArray dias) throws Exception {
        float d = context.getResources().getDisplayMetrics().density;
        int w = (int) (260 * d), h = (int) (80 * d);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        NumberFormat n = NumberFormat.getIntegerInstance(Locale.getDefault());

        int cuantos = dias.length(), max = 1;
        for (int i = 0; i < cuantos; i++) max = Math.max(max, dias.getJSONObject(i).getInt("total"));

        Paint linea = new Paint(Paint.ANTI_ALIAS_FLAG);
        linea.setColor(0xFF4E6129);
        linea.setStyle(Paint.Style.STROKE);
        linea.setStrokeWidth(2.5f * d);
        linea.setStrokeCap(Paint.Cap.ROUND);
        linea.setStrokeJoin(Paint.Join.ROUND);
        int[] colores = {0xFF347D5F, 0xFFAF591C, 0xFF65327C, 0xFF2878BE, 0xFFC83C50, 0xFFBE9614, 0xFF289687, 0xFF78787E};
        Paint punto = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint texto = new Paint(Paint.ANTI_ALIAS_FLAG);
        texto.setColor(0xFF666666);
        texto.setTextAlign(Paint.Align.CENTER);
        texto.setTextSize(9 * d);

        float margen = 22 * d, arriba = 16 * d, abajo = 14 * d;
        float alto = h - arriba - abajo, paso = cuantos > 1 ? (w - 2 * margen) / (cuantos - 1) : 0;
        Path camino = new Path();
        float[] xs = new float[cuantos], ys = new float[cuantos];
        for (int i = 0; i < cuantos; i++) {
            xs[i] = cuantos > 1 ? margen + i * paso : w / 2f;
            ys[i] = h - abajo - alto * dias.getJSONObject(i).getInt("total") / max;
            if (i == 0) camino.moveTo(xs[i], ys[i]); else camino.lineTo(xs[i], ys[i]);
        }
        c.drawPath(camino, linea);
        for (int i = 0; i < cuantos; i++) {
            JSONObject o = dias.getJSONObject(i);
            punto.setColor(colores[i % colores.length]);   // cada punto con su color
            c.drawCircle(xs[i], ys[i], 3.5f * d, punto);
            c.drawText(n.format(o.getInt("total")), xs[i], ys[i] - 6 * d, texto);   // cantidad completa, sin abreviar
            c.drawText(o.getString("dia"), xs[i], h - 2 * d, texto);
        }
        return bmp;
    }
}
