import SwiftUI
import WatchKit
import WatchConnectivity
import WidgetKit

@main
struct RelojEventosApp: App {
    @WKApplicationDelegateAdaptor private var delegado: DelegadoReloj

    var body: some Scene {
        WindowGroup { VistaPrincipal().environmentObject(ModeloReloj.compartido) }
    }
}

enum EstadoSesion: Equatable {
    case sinSesion   // el iPhone no ha mandado sesión, o se cerró
    case vencida     // el JWT caducó o la API lo rechazó: hay que entrar de nuevo en el iPhone
    case activa
}

/// Estado de la app del reloj: sesión recibida del iPhone y últimos KPIs (los mismos que leen las complicaciones).
@MainActor
final class ModeloReloj: ObservableObject {
    static let compartido = ModeloReloj()

    @Published private(set) var resumen: Resumen? = Cache.leer()
    @Published private(set) var estado: EstadoSesion = .sinSesion
    @Published private(set) var cargando = false
    @Published private(set) var sinRed = false

    private init() { estado = Self.estadoDe(Llavero.leer()) }

    private static func estadoDe(_ c: Credenciales?) -> EstadoSesion {
        guard let c else { return .sinSesion }
        return c.vencida ? .vencida : .activa
    }

    /// Contexto que manda el iPhone: la sesión, o `cerrada` al cerrar sesión allá.
    func aplicar(contexto: [String: Any]) async {
        if contexto["cerrada"] as? Bool == true {
            Llavero.guardar(nil); Cache.guardar(nil)
            resumen = nil; estado = .sinSesion
            WidgetCenter.shared.reloadAllTimelines()
            return
        }
        guard let nuevas = Credenciales(contexto: contexto) else { return }
        let anteriores = Llavero.leer()
        if nuevas == anteriores && estado == .activa { return }
        Llavero.guardar(nuevas)
        if anteriores?.macroEvento != nuevas.macroEvento { Cache.guardar(nil); resumen = nil }
        estado = Self.estadoDe(nuevas)
        await actualizar()
    }

    func actualizar() async {
        guard let c = Llavero.leer() else { estado = .sinSesion; return }
        guard !c.vencida else { estado = .vencida; return }
        guard !cargando else { return }
        cargando = true
        defer { cargando = false }
        do {
            let r = try await ApiReloj.consultar(c)
            Cache.guardar(r)
            resumen = r; estado = .activa; sinRed = false
            WidgetCenter.shared.reloadAllTimelines()
        } catch FallaApi.vencida {
            estado = .vencida
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            sinRed = true   // se conservan los últimos números
        }
    }
}

/// Recibe la sesión del iPhone y atiende los refrescos en segundo plano (cada ~15 min; watchOS decide el momento exacto).
final class DelegadoReloj: NSObject, WKApplicationDelegate, WCSessionDelegate {
    private var tareasConexion: [WKWatchConnectivityRefreshBackgroundTask] = []

    func applicationDidFinishLaunching() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
        programarRefresco()
    }

    func applicationDidBecomeActive() {
        Task { await ModeloReloj.compartido.actualizar() }
    }

    private func programarRefresco() {
        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: Date().addingTimeInterval(Reloj.minutosRefresco * 60), userInfo: nil) { _ in }
    }

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for tarea in backgroundTasks {
            switch tarea {
            case let t as WKApplicationRefreshBackgroundTask:
                Task {
                    await ModeloReloj.compartido.actualizar()
                    programarRefresco()
                    t.setTaskCompletedWithSnapshot(false)
                }
            case let t as WKWatchConnectivityRefreshBackgroundTask:
                // se completa cuando ya no queda nada por recibir del iPhone
                tareasConexion.append(t)
                completarTareasConexion()
            default:
                tarea.setTaskCompletedWithSnapshot(false)
            }
        }
    }

    private func completarTareasConexion() {
        guard WCSession.default.activationState == .activated, !WCSession.default.hasContentPending else { return }
        tareasConexion.forEach { $0.setTaskCompletedWithSnapshot(false) }
        tareasConexion.removeAll()
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        let contexto = session.receivedApplicationContext
        Task { @MainActor in
            if !contexto.isEmpty { await ModeloReloj.compartido.aplicar(contexto: contexto) }
            completarTareasConexion()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext contexto: [String: Any]) {
        Task { @MainActor in
            await ModeloReloj.compartido.aplicar(contexto: contexto)
            completarTareasConexion()
        }
    }
}
