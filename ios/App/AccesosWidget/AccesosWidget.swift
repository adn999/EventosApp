import WidgetKit
import SwiftUI
import ActivityKit
import Charts
import AppIntents

// Los botones abren la app con enlaces `eventosscouts://…` (los atiende EnlacesService en la web).
// Los KPIs los calcula la app (ResumenWidgetPlugin) y los deja en el App Group. El botón "Actualizar" los consulta
// desde el widget con la sesión que la app deja en el llavero compartido (la misma que recibe el Apple Watch).

private let grupo = "group.mx.org.scouts.eventosapp"
private let morado = Color(red: 101/255, green: 50/255, blue: 124/255)

struct Kpis {
    var macroEvento = ""
    var asistencia = 0, registros = 0
    var kitEntregados = 0, kitIncluye = 0
    var comidasEntregadas = 0, comidas = 0
    var actualizado: Date?

    /// Lee lo que dejó la app; nil si todavía no hay datos (sesión cerrada o app sin abrir).
    static func leer() -> Kpis? {
        guard let d = UserDefaults(suiteName: grupo)?.dictionary(forKey: "kpis"),
              let t = d["actualizado"] as? Double else { return nil }
        func n(_ k: String) -> Int { (d[k] as? NSNumber)?.intValue ?? 0 }
        return Kpis(macroEvento: d["macroEvento"] as? String ?? "",
                    asistencia: n("asistencia"), registros: n("registros"),
                    kitEntregados: n("kitEntregados"), kitIncluye: n("kitIncluye"),
                    comidasEntregadas: n("comidasEntregadas"), comidas: n("comidas"),
                    actualizado: Date(timeIntervalSince1970: t))
    }
}

/// Botón "Actualizar" del widget: consulta los KPIs con la sesión del llavero y los guarda como lo hace la app.
/// Sin sesión (o con el JWT vencido) no hace nada: el widget sigue mostrando los últimos números.
struct ActualizarKpisIntent: AppIntent {
    static let title: LocalizedStringResource = "Actualizar indicadores"
    static let description = IntentDescription("Vuelve a consultar asistencia, kits y comidas.")

    func perform() async throws -> some IntentResult {
        guard let c = Llavero.leer(), !c.vencida, let r = try? await ApiReloj.consultar(c),
              let defaults = UserDefaults(suiteName: grupo) else { return .result() }
        let ahora = Date().timeIntervalSince1970
        defaults.set(["actualizado": ahora, "macroEvento": r.macroEvento,
                      "asistencia": r.asistencia, "registros": r.registros,
                      "kitEntregados": r.kitEntregados, "kitIncluye": r.kitIncluye,
                      "comidasEntregadas": r.comidasEntregadas, "comidas": r.comidas] as [String: Any], forKey: "kpis")
        // la gráfica de avance por día (mismos bloques AM/PM que arma la app); si el reporte no llegó se deja la anterior
        if !r.dias.isEmpty {
            defaults.set(["actualizado": ahora, "macroEvento": r.macroEvento,
                          "dias": r.dias.map { ["dia": $0.dia, "total": $0.total] }] as [String: Any], forKey: "avanceDia")
        }
        WidgetCenter.shared.reloadAllTimelines()   // los dos widgets (indicadores y avance), no solo el que se tocó
        return .result()
    }
}

/// Botón circular de actualizar (solo el ícono).
struct BotonActualizar: View {
    var body: some View {
        Button(intent: ActualizarKpisIntent()) {
            Image(systemName: "arrow.clockwise").font(.system(size: 11, weight: .bold))
                .foregroundStyle(morado)
                .frame(width: 24, height: 24)
                .background(.white.opacity(0.55), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Actualizar indicadores")
    }
}

struct EntradaAccesos: TimelineEntry {
    let date: Date
    let kpis: Kpis?
}

struct ProveedorAccesos: TimelineProvider {
    func placeholder(in context: Context) -> EntradaAccesos {
        EntradaAccesos(date: .now, kpis: Kpis(macroEvento: "Evento", asistencia: 1200, registros: 1500, kitEntregados: 900, kitIncluye: 1200, comidasEntregadas: 2300, comidas: 3000, actualizado: .now))
    }
    func getSnapshot(in context: Context, completion: @escaping (EntradaAccesos) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : EntradaAccesos(date: .now, kpis: Kpis.leer()))
    }
    // La app avisa con reloadAllTimelines() cuando hay números nuevos; esto es solo un respaldo.
    func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaAccesos>) -> Void) {
        let ahora = Date()
        completion(Timeline(entries: [EntradaAccesos(date: ahora, kpis: Kpis.leer())],
                            policy: .after(ahora.addingTimeInterval(15 * 60))))
    }
}

// MARK: - Vistas

struct Indicador: View {
    let titulo: String
    let valor: Int
    let total: Int?
    let color: Color

    /// Avance 0...1; sin total (Comidas) el anillo va completo si ya hay entregas y vacío si todavía no hay.
    private var avance: Double {
        guard let total = total else { return valor > 0 ? 1 : 0 }
        return total > 0 ? min(Double(valor) / Double(total), 1) : 0
    }

    var body: some View {
        VStack(spacing: 2) {
            Text(titulo).font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
            ZStack {
                Circle().stroke(color.opacity(0.18), lineWidth: 6)
                Circle().trim(from: 0, to: avance)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(valor.formatted()).font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(color)
                    .minimumScaleFactor(0.5).lineLimit(1).padding(.horizontal, 5)
            }
            .frame(width: 52, height: 52)
            if let total = total {
                Text("de \(total.formatted())").font(.system(size: 14, weight: .medium)).foregroundStyle(.secondary)
                    .minimumScaleFactor(0.7).lineLimit(1)
            } else {
                Text(" ").font(.system(size: 14))
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct FranjaKpis: View {
    let kpis: Kpis?

    var body: some View {
        if let k = kpis {
            VStack(spacing: 2) {
                HStack(spacing: 4) {
                    Indicador(titulo: "Asistencia", valor: k.asistencia, total: k.registros, color: Color(red: 78/255, green: 97/255, blue: 41/255))
                    Indicador(titulo: "Kits", valor: k.kitEntregados, total: k.kitIncluye, color: Color(red: 52/255, green: 125/255, blue: 95/255))
                    Indicador(titulo: "Comidas", valor: k.comidasEntregadas, total: nil, color: Color(red: 175/255, green: 89/255, blue: 28/255))
                }
                if let t = k.actualizado {
                    Text("\(k.macroEvento.isEmpty ? "" : k.macroEvento + " · ")actualizado \(t, style: .time)")
                        .font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(1)
                }
            }
        } else {
            Text("Abre la app para ver los indicadores")
                .font(.system(size: 12)).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, minHeight: 50)
        }
    }
}

struct BotonAcceso: View {
    let titulo: String
    let icono: String
    let color: Color
    let url: String

    var body: some View {
        Link(destination: URL(string: url)!) {
            HStack(spacing: 6) {
                Image(systemName: icono).font(.system(size: 17, weight: .semibold)).foregroundStyle(color)
                Text(titulo).font(.system(size: 13, weight: .semibold)).foregroundStyle(.primary)
                    .minimumScaleFactor(0.8).lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 34)
            .background(color.opacity(0.14), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

/// Logo scout (PNG suelto dentro de la extensión del widget).
struct LogoScout: View {
    var body: some View {
        if let ruta = Bundle.main.path(forResource: "logoScout", ofType: "png"), let img = UIImage(contentsOfFile: ruta) {
            Image(uiImage: img).resizable().scaledToFit()
        }
    }
}

/// Fondo translúcido con el logo grande y atenuado, pegado a la derecha
struct FondoLogo: View {
    var logo: CGFloat = 190
    var desplazamiento: CGFloat = 32
    var body: some View {
        ZStack(alignment: .trailing) {
            Rectangle().fill(.ultraThinMaterial)
            LogoScout().opacity(0.16).frame(width: logo, height: logo).offset(x: desplazamiento)
        }
    }
}

private let verde = Color(red: 78/255, green: 97/255, blue: 41/255)

struct VistaMediana: View {
    let entrada: EntradaAccesos

    var body: some View {
        VStack(spacing: 8) {
            // Toda la franja de KPIs abre la pantalla de indicadores
            Link(destination: URL(string: "eventosscouts://kpis")!) { FranjaKpis(kpis: entrada.kpis) }
                .overlay(alignment: .topTrailing) { if entrada.kpis != nil { BotonActualizar().offset(x: 4, y: -6) } }
            HStack(spacing: 6) {
                BotonAcceso(titulo: "Registro", icono: "square.and.pencil", color: verde, url: "eventosscouts://registro")
                BotonAcceso(titulo: "Kit", icono: "cart", color: Color(red: 52/255, green: 125/255, blue: 95/255), url: "eventosscouts://kit")
                BotonAcceso(titulo: "Consulta", icono: "binoculars", color: Color(red: 40/255, green: 150/255, blue: 135/255), url: "eventosscouts://consulta")
            }
        }
    }
}

/// Widget pequeño: un solo anillo grande con la asistencia.
struct VistaPequena: View {
    let kpis: Kpis?

    var body: some View {
        if let k = kpis {
            let avance = k.registros > 0 ? min(Double(k.asistencia) / Double(k.registros), 1) : 0
            VStack(spacing: 3) {
                HStack {
                    Text("Asistencia").font(.system(size: 14, weight: .semibold)).foregroundStyle(.secondary)
                    Spacer(minLength: 2)
                    BotonActualizar()
                }
                ZStack {
                    Circle().stroke(verde.opacity(0.18), lineWidth: 9)
                    Circle().trim(from: 0, to: avance)
                        .stroke(verde, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text(k.asistencia.formatted()).font(.system(size: 26, weight: .bold, design: .rounded)).foregroundStyle(verde)
                        .minimumScaleFactor(0.5).lineLimit(1).padding(.horizontal, 12)
                }
                .frame(width: 92, height: 92)
                Text("de \(k.registros.formatted())").font(.system(size: 14, weight: .medium)).foregroundStyle(.secondary)
            }
        } else {
            Text("Abre la app para ver los indicadores").font(.system(size: 13)).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
    }
}

/// Pantalla de bloqueo, circular: anillo de asistencia.
struct BloqueoCircular: View {
    let kpis: Kpis?

    var body: some View {
        let k = kpis ?? Kpis()
        Gauge(value: Double(k.asistencia), in: 0...Double(max(k.registros, 1))) {
            Image(systemName: "person.3.fill")
        } currentValueLabel: {
            Text(k.asistencia.formatted(.number.notation(.compactName)))
        }
        .gaugeStyle(.accessoryCircular)
    }
}

/// Pantalla de bloqueo, rectangular: las tres cifras.
struct BloqueoRectangular: View {
    let kpis: Kpis?

    var body: some View {
        if let k = kpis {
            VStack(alignment: .leading, spacing: 1) {
                Text(k.macroEvento.isEmpty ? "Eventos Scouts" : k.macroEvento).font(.headline).lineLimit(1)
                Text("Asistencia \(k.asistencia.formatted()) de \(k.registros.formatted())").font(.caption)
                Text("Kits \(k.kitEntregados.formatted()) de \(k.kitIncluye.formatted())").font(.caption)
                Text("Comidas \(k.comidasEntregadas.formatted())").font(.caption)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text("Abre la app para ver los indicadores").font(.caption)
        }
    }
}

struct VistaAccesos: View {
    @Environment(\.widgetFamily) private var familia
    let entrada: EntradaAccesos

    var body: some View {
        switch familia {
        case .systemSmall:
            VistaPequena(kpis: entrada.kpis)
                .widgetURL(URL(string: "eventosscouts://kpis"))
                .containerBackground(for: .widget) { FondoLogo(logo: 140, desplazamiento: 28) }
        case .accessoryCircular:
            BloqueoCircular(kpis: entrada.kpis)
                .widgetURL(URL(string: "eventosscouts://kpis"))
                .containerBackground(for: .widget) { AccessoryWidgetBackground() }
        case .accessoryRectangular:
            BloqueoRectangular(kpis: entrada.kpis)
                .widgetURL(URL(string: "eventosscouts://kpis"))
                .containerBackground(for: .widget) { Color.clear }
        default:
            VistaMediana(entrada: entrada)
                .containerBackground(for: .widget) { FondoLogo() }
        }
    }
}

// MARK: - Live Activity (isla dinámica y pantalla de bloqueo del iPhone)

struct PantallaBloqueoActividad: View {
    let contexto: ActivityViewContext<KpiActividad>

    private func columna(_ titulo: String, _ valor: Int, _ total: Int?) -> some View {
        VStack(spacing: 1) {
            Text(titulo).font(.system(size: 12, weight: .medium)).opacity(0.8)
            Text(valor.formatted()).font(.system(size: 26, weight: .bold, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1)
            Text(total.map { "de \($0.formatted())" } ?? " ").font(.system(size: 12)).opacity(0.8)
        }
        .frame(maxWidth: .infinity)
    }

    var body: some View {
        let e = contexto.state
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                LogoScout().frame(width: 18, height: 18)
                Text(contexto.attributes.macroEvento.isEmpty ? "Eventos Scouts" : contexto.attributes.macroEvento)
                    .font(.system(size: 13, weight: .semibold)).lineLimit(1)
                Spacer()
                Text(contexto.isStale ? "desactualizado" : "actualizado \(e.actualizado, style: .time)")
                    .font(.system(size: 11)).opacity(0.8)
            }
            HStack {
                columna("Asistencia", e.asistencia, e.registros)
                columna("Kits", e.kitEntregados, e.kitIncluye)
                columna("Comidas", e.comidasEntregadas, nil)
            }
        }
        .foregroundStyle(.white)
        .padding(14)
    }
}

/// Live Activity: en iPhone la pantalla de bloqueo; en el Smart Stack del Apple Watch (watchOS 11+) la versión compacta.
struct VistaActividad: View {
    let contexto: ActivityViewContext<KpiActividad>

    var body: some View {
        if #available(iOS 18.0, *) { ConFamilia(contexto: contexto) } else { PantallaBloqueoActividad(contexto: contexto) }
    }

    @available(iOS 18.0, *)
    struct ConFamilia: View {
        @Environment(\.activityFamily) private var familia
        let contexto: ActivityViewContext<KpiActividad>

        var body: some View {
            if familia == .small {
                let e = contexto.state
                VStack(alignment: .leading, spacing: 1) {
                    Text("Asistencia").font(.system(size: 12, weight: .medium))
                    Text(e.asistencia.formatted()).font(.system(size: 24, weight: .bold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.6)
                    Text("de \(e.registros.formatted()) · kits \(e.kitEntregados.formatted())").font(.system(size: 11)).lineLimit(1).minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                PantallaBloqueoActividad(contexto: contexto)
            }
        }
    }
}

extension WidgetConfiguration {
    /// Pide también la versión pequeña (Apple Watch) donde el sistema la soporta.
    func conReloj() -> some WidgetConfiguration {
        if #available(iOS 18.0, *) { return self.supplementalActivityFamilies([.small]) } else { return self }
    }
}

struct KpiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: KpiActividad.self) { contexto in
            VistaActividad(contexto: contexto)
                .activityBackgroundTint(morado.opacity(0.92))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "eventosscouts://kpis"))
        } dynamicIsland: { contexto in
            let e = contexto.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack { Text("Asistencia").font(.caption2); Text(e.asistencia.formatted()).font(.title3.bold()) }
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack { Text("Kits").font(.caption2); Text(e.kitEntregados.formatted()).font(.title3.bold()) }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack { Text("Comidas").font(.caption2); Text(e.comidasEntregadas.formatted()).font(.title3.bold()) }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(contexto.attributes.macroEvento.isEmpty ? "" : contexto.attributes.macroEvento + " · ")actualizado \(e.actualizado, style: .time)")
                        .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "person.3.fill")
            } compactTrailing: {
                Text(e.asistencia.formatted(.number.notation(.compactName)))
            } minimal: {
                Text(e.asistencia.formatted(.number.notation(.compactName))).font(.caption2)
            }
            .widgetURL(URL(string: "eventosscouts://kpis"))
        }
        .conReloj()
    }
}

struct AccesosWidget: Widget {
    let kind = "mx.org.scouts.eventos.accesos"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProveedorAccesos()) { entrada in VistaAccesos(entrada: entrada) }
            .configurationDisplayName("Accesos rápidos")
            .description("Indicadores del evento y acceso directo a Registro, Kit y Consulta.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

// MARK: - Widget de avance por día

struct AvanceDia {
    struct Punto: Identifiable { let id: Int; let dia: String; let total: Int }
    var macroEvento = ""
    var puntos: [Punto] = []
    var actualizado: Date?

    static func leer() -> AvanceDia? {
        guard let d = UserDefaults(suiteName: grupo)?.dictionary(forKey: "avanceDia"),
              let t = d["actualizado"] as? Double else { return nil }
        let filas = d["dias"] as? [[String: Any]] ?? []
        return AvanceDia(macroEvento: d["macroEvento"] as? String ?? "",
                         puntos: filas.enumerated().map { Punto(id: $0.offset, dia: $0.element["dia"] as? String ?? "", total: ($0.element["total"] as? NSNumber)?.intValue ?? 0) },
                         actualizado: Date(timeIntervalSince1970: t))
    }
}

struct EntradaAvance: TimelineEntry {
    let date: Date
    let avance: AvanceDia?
}

struct ProveedorAvance: TimelineProvider {
    func placeholder(in context: Context) -> EntradaAvance {
        let dias = ["Jue", "Vie", "Sáb", "Dom"], totales = [180, 520, 940, 1200]
        return EntradaAvance(date: .now, avance: AvanceDia(macroEvento: "Evento", puntos: zip(dias, totales).enumerated().map { .init(id: $0.offset, dia: $0.element.0, total: $0.element.1) }, actualizado: .now))
    }
    func getSnapshot(in context: Context, completion: @escaping (EntradaAvance) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : EntradaAvance(date: .now, avance: AvanceDia.leer()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaAvance>) -> Void) {
        let ahora = Date()
        completion(Timeline(entries: [EntradaAvance(date: ahora, avance: AvanceDia.leer())], policy: .after(ahora.addingTimeInterval(15 * 60))))
    }
}

private let coloresPuntos: [Color] = [
    Color(red: 52/255, green: 125/255, blue: 95/255), Color(red: 175/255, green: 89/255, blue: 28/255),
    Color(red: 101/255, green: 50/255, blue: 124/255), Color(red: 40/255, green: 120/255, blue: 190/255),
    Color(red: 200/255, green: 60/255, blue: 80/255), Color(red: 190/255, green: 150/255, blue: 20/255),
    Color(red: 40/255, green: 150/255, blue: 135/255), Color(red: 120/255, green: 120/255, blue: 130/255),
]

/// Versión para la pantalla de bloqueo y el Smart Stack del Apple Watch: línea sin ejes y la última cifra completa.
struct AvanceRectangular: View {
    let avance: AvanceDia?

    var body: some View {
        if let a = avance, let ultimo = a.puntos.last {
            VStack(alignment: .leading, spacing: 1) {
                Text("Avance por día").font(.headline).lineLimit(1)
                Text("\(ultimo.dia): \(ultimo.total.formatted())").font(.caption).lineLimit(1)
                Chart(a.puntos) { p in
                    LineMark(x: .value("Bloque", p.id), y: .value("Registros", p.total)).interpolationMethod(.catmullRom)
                }
                .chartXAxis(.hidden).chartYAxis(.hidden)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text("Abre la app para ver el avance por día").font(.caption)
        }
    }
}

struct VistaAvanceDia: View {
    @Environment(\.widgetFamily) private var familia
    let entrada: EntradaAvance

    var body: some View {
        if familia == .accessoryRectangular { AvanceRectangular(avance: entrada.avance) } else { grande }
    }

    @ViewBuilder private var grande: some View {
        if let a = entrada.avance, !a.puntos.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Avance por día").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
                    Spacer()
                    if let t = a.actualizado { Text(t, style: .time).font(.system(size: 9)).foregroundStyle(.secondary) }
                    BotonActualizar()
                }
                Chart(a.puntos) { p in
                    LineMark(x: .value("Bloque", p.dia), y: .value("Registros", p.total))
                        .foregroundStyle(verde).interpolationMethod(.catmullRom).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    PointMark(x: .value("Bloque", p.dia), y: .value("Registros", p.total))
                        .foregroundStyle(coloresPuntos[p.id % coloresPuntos.count]).symbolSize(40)
                        .annotation(position: .top, spacing: 2) { Text(p.total.formatted()).font(.system(size: 9, weight: .medium)).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7) }
                }
                .chartYScale(domain: 0...(Int(Double(a.puntos.map(\.total).max() ?? 1) * 1.25) + 1))
                .chartYAxis(.hidden)
                .chartXAxis { AxisMarks { _ in AxisValueLabel().font(.system(size: 8)) } }
            }
        } else {
            Text("Abre la app para ver el avance por día").font(.system(size: 12)).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

/// Fondo con logo en la pantalla de inicio; transparente en pantalla de bloqueo y Apple Watch.
struct FondoAvance: View {
    @Environment(\.widgetFamily) private var familia
    var body: some View {
        if familia == .accessoryRectangular { Color.clear } else { FondoLogo() }
    }
}

struct AvanceDiaWidget: Widget {
    let kind = "mx.org.scouts.eventos.avanceDia"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProveedorAvance()) { entrada in
            VistaAvanceDia(entrada: entrada)
                .widgetURL(URL(string: "eventosscouts://kpis"))
                .containerBackground(for: .widget) { FondoAvance() }
        }
        .configurationDisplayName("Avance por día")
        .description("Gráfica de línea con el avance del evento cada 12 horas.")
        .supportedFamilies([.systemMedium, .accessoryRectangular])
    }
}

@main
struct AccesosBundle: WidgetBundle {
    var body: some Widget {
        AccesosWidget()
        AvanceDiaWidget()
        KpiLiveActivity()
    }
}
