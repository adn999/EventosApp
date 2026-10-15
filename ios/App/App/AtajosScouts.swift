import AppIntents
import UIKit

/// Atajos de Siri y de la app Atajos. Las frases están en español: el idioma base del proyecto (developmentRegion) debe ser
/// "es"; con "en" Siri las registraba como inglesas y no las reconocía al hablarle en español. Los cuatro primeros abren la pantalla (con los mismos enlaces eventosscouts://… que usa el widget);
/// el último contesta con los números que dejó la app en el App Group, sin abrirla.
private let grupo = "group.mx.org.scouts.eventosapp"

@MainActor
private func abrirPantalla(_ destino: String) async {
    if let url = URL(string: "eventosscouts://\(destino)") { await UIApplication.shared.open(url) }
}

struct AbrirRegistroIntent: AppIntent {
    static let title: LocalizedStringResource = "Abrir Registro"
    static let description = IntentDescription("Abre la pantalla de Registro de asistencia.")
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { await abrirPantalla("registro"); return .result() }
}

struct AbrirKitIntent: AppIntent {
    static let title: LocalizedStringResource = "Abrir Kit"
    static let description = IntentDescription("Abre la pantalla de entrega de kits.")
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { await abrirPantalla("kit"); return .result() }
}

struct AbrirConsultaIntent: AppIntent {
    static let title: LocalizedStringResource = "Abrir Consulta"
    static let description = IntentDescription("Abre la consulta de pulseras.")
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { await abrirPantalla("consulta"); return .result() }
}

struct AbrirIndicadoresIntent: AppIntent {
    static let title: LocalizedStringResource = "Abrir Indicadores"
    static let description = IntentDescription("Abre la pantalla de indicadores del evento.")
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { await abrirPantalla("kpis"); return .result() }
}

/// "Buscar pulsera en Eventos Scouts": Siri pregunta el número de pulsera o el CUM y abre Consulta con la búsqueda hecha.
/// En los textos de Siri se dice "clave de membresía": App Store Connect rechaza el build (ITMS-90626) si un App Intent contiene "cum".
struct BuscarPulseraIntent: AppIntent {
    static let title: LocalizedStringResource = "Buscar pulsera o membresía"
    static let description = IntentDescription("Busca una pulsera o una clave de membresía en la consulta de pulseras.")
    static let openAppWhenRun = true

    @Parameter(title: "Pulsera o membresía", requestValueDialog: IntentDialog("¿Qué pulsera o clave de membresía busco?"))
    var codigo: String

    @MainActor func perform() async throws -> some IntentResult {
        // Siri dicta con espacios, guiones y minúsculas ("nal 239-0004"): solo se dejan letras y números, en mayúsculas
        let limpio = String(codigo.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }).uppercased()
        var c = URLComponents()
        c.queryItems = [URLQueryItem(name: "buscar", value: limpio)]
        await abrirPantalla("consulta" + (c.percentEncodedQuery.map { "?" + $0 } ?? ""))
        return .result()
    }
}

struct ConsultarIndicadoresIntent: AppIntent {
    static let title: LocalizedStringResource = "Consultar indicadores"
    static let description = IntentDescription("Dice la asistencia, los kits y las comidas del evento.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let d = UserDefaults(suiteName: grupo)?.dictionary(forKey: "kpis") else {
            return .result(dialog: "Abre la app e inicia sesión para ver los indicadores.")
        }
        func n(_ k: String) -> Int { (d[k] as? NSNumber)?.intValue ?? 0 }
        let evento = (d["macroEvento"] as? String).flatMap { $0.isEmpty ? nil : $0 + ". " } ?? ""
        let texto = "\(evento)Asistencia: \(n("asistencia").formatted()) de \(n("registros").formatted()). "
            + "Kits entregados: \(n("kitEntregados").formatted()) de \(n("kitIncluye").formatted()). "
            + "Comidas entregadas: \(n("comidasEntregadas").formatted())."
        return .result(dialog: IntentDialog(stringLiteral: texto))
    }
}

struct AtajosScouts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: ConsultarIndicadoresIntent(),
                    phrases: ["Indicadores de \(.applicationName)", "Cuánta asistencia hay en \(.applicationName)"],
                    shortTitle: "Indicadores", systemImageName: "chart.bar.fill")
        AppShortcut(intent: AbrirRegistroIntent(),
                    phrases: ["Abrir registro en \(.applicationName)"],
                    shortTitle: "Registro", systemImageName: "square.and.pencil")
        AppShortcut(intent: AbrirKitIntent(),
                    phrases: ["Abrir kit en \(.applicationName)"],
                    shortTitle: "Kit", systemImageName: "cart")
        AppShortcut(intent: BuscarPulseraIntent(),
                    phrases: ["Consultar pulsera en \(.applicationName)", "Consultar membresía en \(.applicationName)",
                              "Consulta una pulsera en \(.applicationName)", "Consulta una membresía en \(.applicationName)",
                              "Buscar pulsera en \(.applicationName)", "Buscar membresía en \(.applicationName)",
                              "Busca una pulsera en \(.applicationName)", "Busca una membresía en \(.applicationName)"],
                    shortTitle: "Buscar pulsera", systemImageName: "magnifyingglass")
        AppShortcut(intent: AbrirConsultaIntent(),
                    phrases: ["Abrir consulta en \(.applicationName)"],
                    shortTitle: "Consulta", systemImageName: "binoculars")
        AppShortcut(intent: AbrirIndicadoresIntent(),
                    phrases: ["Abrir indicadores en \(.applicationName)"],
                    shortTitle: "Abrir indicadores", systemImageName: "chart.pie.fill")
    }
}
