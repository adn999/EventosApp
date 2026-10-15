import ActivityKit
import Foundation

/// Datos de la Live Activity de indicadores. Este archivo va en la app y en la extensión del widget.
struct KpiActividad: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var asistencia: Int
        var registros: Int
        var kitEntregados: Int
        var kitIncluye: Int
        var comidasEntregadas: Int
        var actualizado: Date
    }
    var macroEvento: String
}
