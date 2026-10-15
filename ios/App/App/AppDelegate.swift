import UIKit
import Capacitor
import MetricKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        DiagnosticoApp.shared.iniciar()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/// Guarda lo que iOS reporta con MetricKit sobre la app en Documents/Diagnostico:
///  - diag-*.json: crashes, bloqueos (hangs) y cierres por consumo de CPU/disco, con su traza. Llegan al siguiente arranque.
///  - metricas-*.json: resumen de las últimas 24 h; en "applicationExitMetrics" vienen cuántas veces se cerró la app y por qué
///    (memoria, watchdog, cierre normal, en segundo plano o en primer plano). Llega una vez al día.
/// Para sacarlos del teléfono: xcrun devicectl device copy from --device <UDID> --domain-type appDataContainer
///   --domain-identifier mx.org.scouts.eventos --source Documents/Diagnostico --destination ./Diagnostico
final class DiagnosticoApp: NSObject, MXMetricManagerSubscriber {
    static let shared = DiagnosticoApp()
    private let carpeta = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("Diagnostico", isDirectory: true)

    func iniciar() {
        try? FileManager.default.createDirectory(at: carpeta, withIntermediateDirectories: true)
        MXMetricManager.shared.add(self)
    }

    func didReceive(_ payloads: [MXMetricPayload]) {
        guardar(payloads.map { $0.jsonRepresentation() }, prefijo: "metricas")
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        guardar(payloads.map { $0.jsonRepresentation() }, prefijo: "diag")
    }

    private func guardar(_ datos: [Data], prefijo: String) {
        let fecha = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
        for (i, d) in datos.enumerated() {
            try? d.write(to: carpeta.appendingPathComponent("\(prefijo)-\(fecha)-\(i).json"))
        }
        limpiar()
    }

    /// Conserva solo los 40 archivos más recientes.
    private func limpiar() {
        let archivos = (try? FileManager.default.contentsOfDirectory(at: carpeta, includingPropertiesForKeys: [.creationDateKey])) ?? []
        let viejos = archivos.sorted {
            let a = (try? $0.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            let b = (try? $1.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            return a > b
        }.dropFirst(40)
        viejos.forEach { try? FileManager.default.removeItem(at: $0) }
    }
}
