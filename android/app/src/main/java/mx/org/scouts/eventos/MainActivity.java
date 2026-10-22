package mx.org.scouts.eventos;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ResumenWidgetPlugin.class);   // plugin local: KPIs para el widget
        registerPlugin(CodigoBarrasPlugin.class);    // plugin local: escaneo continuo con la cámara abierta
        super.onCreate(savedInstanceState);
        // Android 14 y anteriores: también de borde a borde, como Android 15+.
        // Después de super.onCreate: antes, la ventana se crearía con el tema de arranque (con barra de título)
        EdgeToEdge.enable(this);
    }
}
