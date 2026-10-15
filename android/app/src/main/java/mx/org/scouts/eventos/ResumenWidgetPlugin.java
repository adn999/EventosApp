package mx.org.scouts.eventos;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Deja los KPIs del evento donde los lee el widget (AccesosWidgetProvider).
 * La web hace las consultas (ya tiene la sesión); aquí solo se guardan los totales, nunca datos de personas ni el token.
 */
@CapacitorPlugin(name = "ResumenWidget")
public class ResumenWidgetPlugin extends Plugin {
    static final String PREFS = "widget_kpis";
    private static final String[] CLAVES = {"asistencia", "registros", "kitEntregados", "kitIncluye", "comidasEntregadas", "comidas"};

    @PluginMethod
    public void guardar(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences.Editor ed = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        for (String k : CLAVES) ed.putInt(k, call.getInt(k, 0));
        ed.putString("macroEvento", call.getString("macroEvento", ""));
        ed.putLong("actualizado", System.currentTimeMillis());
        ed.apply();
        AccesosWidgetProvider.actualizarTodos(ctx);
        AnilloWidgetProvider.actualizarTodos(ctx);
        call.resolve();
    }

    /** Serie de avance por día para el widget de gráfica: [{dia, total}] en orden cronológico. */
    @PluginMethod
    public void guardarDia(PluginCall call) {
        Context ctx = getContext();
        JSArray dias = call.getArray("dias", new JSArray());
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("avanceDia", dias.toString()).apply();
        AvanceWidgetProvider.actualizarTodos(ctx);
        call.resolve();
    }

    @PluginMethod
    public void limpiar(PluginCall call) {
        Context ctx = getContext();
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        AccesosWidgetProvider.actualizarTodos(ctx);
        AnilloWidgetProvider.actualizarTodos(ctx);
        AvanceWidgetProvider.actualizarTodos(ctx);
        call.resolve();
    }
}
