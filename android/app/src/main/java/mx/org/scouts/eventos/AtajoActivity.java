package mx.org.scouts.eventos;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Accesos al mantener pulsado el icono. Android lanza los atajos de shortcuts.xml con FLAG_ACTIVITY_CLEAR_TASK,
 * que destruía MainActivity y recargaba la app (se perdía la sesión). Esta actividad invisible vive en su
 * propia tarea, recibe ese borrado y solo reenvía el enlace a MainActivity, que lo atiende sin recrearse
 * (singleTask → onNewIntent → appUrlOpen), igual que los botones del widget.
 */
public class AtajoActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent intent = new Intent(Intent.ACTION_VIEW, getIntent().getData(), this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
        overridePendingTransition(0, 0);
    }
}
