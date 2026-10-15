import Foundation
import Capacitor
import WatchConnectivity

/// Pasa al Apple Watch la sesión (JWT, token, macroevento y ruta de la API) para que la app del reloj consulte los KPIs por su cuenta,
/// aun con esta app cerrada. Es lo único que sale del teléfono con el token; al cerrar sesión desde el menú se le pide al reloj que lo borre.
/// Va como contexto de aplicación: el sistema conserva solo el último y lo entrega aunque la app del reloj no esté abierta.
@objc(SesionRelojPlugin)
public class SesionRelojPlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "SesionRelojPlugin"
    public let jsName = "SesionReloj"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enviar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "borrar", returnType: CAPPluginReturnPromise),
    ]

    private var ultimo: [String: Any]?

    override public func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    @objc func enviar(_ call: CAPPluginCall) {
        let contexto: [String: Any] = ["jwt": call.getString("jwt") ?? "", "token": call.getString("token") ?? "",
                                       "macroEvento": call.getString("macroEvento") ?? "", "api": call.getString("api") ?? ""]
        mandar(contexto)
        // La misma sesión queda en el llavero compartido con el widget del iPhone, para su botón "Actualizar"
        if let c = Credenciales(contexto: contexto), Llavero.leer() != c { Llavero.guardar(c) }
        call.resolve()
    }

    @objc func borrar(_ call: CAPPluginCall) {
        mandar(["cerrada": true])
        Llavero.guardar(nil)
        call.resolve()
    }

    /// Si la sesión de WatchConnectivity aún no está lista, o no hay app en el reloj, se reintenta cuando cambie su estado.
    private func mandar(_ contexto: [String: Any]) {
        ultimo = contexto
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        guard s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
        try? s.updateApplicationContext(contexto)
    }

    public func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if let u = ultimo { mandar(u) }
    }

    public func sessionWatchStateDidChange(_ session: WCSession) {
        if let u = ultimo { mandar(u) }
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}

    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()   // se cambió de reloj: se reactiva para el nuevo
    }
}
