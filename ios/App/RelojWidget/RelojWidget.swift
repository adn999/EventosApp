import WidgetKit
import SwiftUI

/// Complicaciones y Smart Stack del Apple Watch (watchOS 10+). Si la caché tiene más de unos minutos y hay sesión,
/// consultan la API por su cuenta; así se actualizan aunque ni la app del reloj ni la del iPhone estén abiertas.
private let moradoClaro = Color(red: 176/255, green: 128/255, blue: 199/255)

struct EntradaReloj: TimelineEntry {
    let date: Date
    let resumen: Resumen?
    let vencida: Bool
}

struct ProveedorReloj: TimelineProvider {
    func placeholder(in context: Context) -> EntradaReloj { EntradaReloj(date: Date(), resumen: .ejemplo, vencida: false) }

    func getSnapshot(in context: Context, completion: @escaping (EntradaReloj) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : entradaDeCache())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<EntradaReloj>) -> Void) {
        Task {
            var entrada = entradaDeCache()
            let viejo = (entrada.resumen?.actualizado ?? .distantPast) < Date().addingTimeInterval(-5 * 60)
            if let c = Llavero.leer(), !c.vencida, viejo {
                do {
                    let r = try await ApiReloj.consultar(c)
                    Cache.guardar(r)
                    entrada = EntradaReloj(date: Date(), resumen: r, vencida: false)
                } catch FallaApi.vencida {
                    entrada = EntradaReloj(date: Date(), resumen: entrada.resumen, vencida: true)
                } catch { /* sin red: se muestran los últimos números */ }
            }
            completion(Timeline(entries: [entrada], policy: .after(Date().addingTimeInterval(Reloj.minutosRefresco * 60))))
        }
    }

    private func entradaDeCache() -> EntradaReloj {
        let c = Llavero.leer()
        return EntradaReloj(date: Date(), resumen: c == nil ? nil : Cache.leer(), vencida: c?.vencida ?? false)
    }
}

struct VistaComplicacion: View {
    @Environment(\.widgetFamily) private var familia
    let entrada: EntradaReloj

    var body: some View {
        if let r = entrada.resumen {
            switch familia {
            case .accessoryCircular:
                Gauge(value: r.pctAsistencia) {
                    Image(systemName: "person.3.fill")
                } currentValueLabel: {
                    Text("\(Int((r.pctAsistencia * 100).rounded()))")
                }
                .gaugeStyle(.accessoryCircular)
                .tint(moradoClaro)
            case .accessoryCorner:
                Text("\(Int((r.pctAsistencia * 100).rounded()))%")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .widgetLabel {
                        Gauge(value: r.pctAsistencia) { Text("Asistencia") }
                            .tint(moradoClaro)
                    }
            case .accessoryInline:
                Text("Asistencia \(r.asistencia.formatted())/\(r.registros.formatted())")
            default:
                VStack(alignment: .leading, spacing: 0) {
                    Text(entrada.vencida ? "Sesión vencida" : r.macroEvento).font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(moradoClaro).lineLimit(1)
                    Text("Asistencia \(r.asistencia.formatted()) / \(r.registros.formatted())").lineLimit(1).minimumScaleFactor(0.7)
                    Text("Kits \(r.kitEntregados.formatted()) / \(r.kitIncluye.formatted())").lineLimit(1).minimumScaleFactor(0.7)
                    Text("Comidas \(r.comidasEntregadas.formatted())").lineLimit(1).minimumScaleFactor(0.7)
                }
                .font(.system(size: 14, design: .rounded))
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        } else {
            switch familia {
            case .accessoryInline: Text("Eventos: abre el iPhone")
            case .accessoryRectangular: Text("Inicia sesión en Eventos Scouts en tu iPhone").font(.system(size: 13))
            default: Image(systemName: "person.3.fill")
            }
        }
    }
}

@main
struct RelojWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Reloj.tipoWidget, provider: ProveedorReloj()) { entrada in
            VistaComplicacion(entrada: entrada).containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("KPIs del evento")
        .description("Asistencia, kits y comidas del evento elegido en el iPhone.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
    }
}
