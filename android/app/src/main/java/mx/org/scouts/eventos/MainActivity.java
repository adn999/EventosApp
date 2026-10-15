package mx.org.scouts.eventos;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ResumenWidgetPlugin.class);   // plugin local: KPIs para el widget
        registerPlugin(CodigoBarrasPlugin.class);    // plugin local: escaneo continuo con la cámara abierta
        super.onCreate(savedInstanceState);
    }
}
