import Foundation
import WidgetKit
import Capacitor
import ActivityKit

/// Deja los KPIs del evento en el App Group para que el widget los muestre.
/// La web hace las consultas (ya tiene la sesión); aquí solo se guardan los totales, nunca datos de personas ni el token.
@objc(ResumenWidgetPlugin)
public class ResumenWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ResumenWidgetPlugin"
    public let jsName = "ResumenWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "guardar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "guardarDia", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "limpiar", returnType: CAPPluginReturnPromise),
    ]

    private let grupo = "group.mx.org.scouts.eventosapp"

    @objc func guardar(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: grupo) else { return call.reject("Sin App Group") }
        var d: [String: Any] = ["actualizado": Date().timeIntervalSince1970,
                                "macroEvento": call.getString("macroEvento") ?? ""]
        for k in ["asistencia", "registros", "kitEntregados", "kitIncluye", "comidasEntregadas", "comidas"] {
            d[k] = call.getInt(k) ?? 0
        }
        defaults.set(d, forKey: "kpis")
        WidgetCenter.shared.reloadAllTimelines()
        ActividadKpis.actualizar(macro: d["macroEvento"] as? String ?? "",
                                 estado: KpiActividad.ContentState(
                                    asistencia: d["asistencia"] as? Int ?? 0, registros: d["registros"] as? Int ?? 0,
                                    kitEntregados: d["kitEntregados"] as? Int ?? 0, kitIncluye: d["kitIncluye"] as? Int ?? 0,
                                    comidasEntregadas: d["comidasEntregadas"] as? Int ?? 0, actualizado: Date()))
        call.resolve()
    }

    /// Serie de avance por día para el widget de gráfica: [{dia, total}] en orden cronológico.
    @objc func guardarDia(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: grupo) else { return call.reject("Sin App Group") }
        let dias = (call.getArray("dias") as? [[String: Any]] ?? []).map {
            ["dia": $0["dia"] as? String ?? "", "total": ($0["total"] as? NSNumber)?.intValue ?? 0]
        }
        defaults.set(["actualizado": Date().timeIntervalSince1970,
                      "macroEvento": call.getString("macroEvento") ?? "", "dias": dias], forKey: "avanceDia")
        WidgetCenter.shared.reloadTimelines(ofKind: "mx.org.scouts.eventos.avanceDia")
        call.resolve()
    }

    @objc func limpiar(_ call: CAPPluginCall) {
        UserDefaults(suiteName: grupo)?.removeObject(forKey: "kpis")
        UserDefaults(suiteName: grupo)?.removeObject(forKey: "avanceDia")
        WidgetCenter.shared.reloadAllTimelines()
        ActividadKpis.terminar()
        call.resolve()
    }
}

/// Live Activity de indicadores (iPhone: isla dinámica y pantalla de bloqueo). Se inicia y se actualiza cada vez que la app
/// guarda números nuevos; sin servidor de notificaciones solo se actualiza mientras la app se usa, y el sistema la cierra a las ~8 h.
enum ActividadKpis {
    static func actualizar(macro: String, estado: KpiActividad.ContentState) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        // pasada la media hora sin datos nuevos el sistema la marca como desactualizada
        let contenido = ActivityContent(state: estado, staleDate: Date().addingTimeInterval(30 * 60))
        Task {
            if let actual = Activity<KpiActividad>.activities.first {
                if actual.attributes.macroEvento == macro { return await actual.update(contenido) }
                await actual.end(nil, dismissalPolicy: .immediate)   // cambió el macroevento: se reinicia
            }
            _ = try? Activity.request(attributes: KpiActividad(macroEvento: macro), content: contenido)   // falla si la app no está en primer plano
        }
    }

    static func terminar() {
        Task { for a in Activity<KpiActividad>.activities { await a.end(nil, dismissalPolicy: .immediate) } }
    }
}
