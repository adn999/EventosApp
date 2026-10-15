package mx.org.scouts.eventos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Widget pequeño: un anillo grande con la asistencia. Toma los números que deja la app (ResumenWidgetPlugin)
 * y al tocarlo abre la pantalla de indicadores (eventosscouts://kpis).
 */
public class AnilloWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    /** Redibuja todos los widgets pequeños colocados (la app lo llama al guardar números nuevos). */
    static void actualizarTodos(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AnilloWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, construir(context));
    }

    private static RemoteViews construir(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_anillo);
        NumberFormat n = NumberFormat.getIntegerInstance(Locale.getDefault());
        SharedPreferences p = context.getSharedPreferences(ResumenWidgetPlugin.PREFS, Context.MODE_PRIVATE);

        if (p.contains("actualizado")) {
            int asistencia = p.getInt("asistencia", 0), registros = p.getInt("registros", 0);
            v.setViewVisibility(R.id.contenido, View.VISIBLE);
            v.setViewVisibility(R.id.sin_datos, View.GONE);
            AccesosWidgetProvider.valor(v, R.id.valor, n.format(asistencia), 1.7f);
            v.setTextViewText(R.id.total, "de " + n.format(registros));
            v.setImageViewBitmap(R.id.anillo, AccesosWidgetProvider.anillo(context, asistencia, registros, 0xFF4E6129, 92, 9));
        } else {
            v.setViewVisibility(R.id.contenido, View.GONE);
            v.setViewVisibility(R.id.sin_datos, View.VISIBLE);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("eventosscouts://kpis"));
        intent.setClass(context, MainActivity.class);
        v.setOnClickPendingIntent(R.id.raiz, PendingIntent.getActivity(context, 7, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }
}
