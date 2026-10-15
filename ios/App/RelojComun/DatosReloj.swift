import Foundation
import Security

/// Código común de la app del Apple Watch y de sus complicaciones: sesión en el llavero, caché de KPIs y consultas a la API.
/// El iPhone manda la sesión por WatchConnectivity (SesionRelojPlugin); con ella el reloj consulta los reportes por su cuenta,
/// aunque la app del iPhone esté cerrada, hasta que el JWT caduque o se cierre sesión en el iPhone.
enum Reloj {
    static let grupo = "group.mx.org.scouts.eventosapp"
    /// Grupo de llavero compartido por la app y la extensión de complicaciones (prefijo del equipo + identificador).
    static let grupoLlavero = "89EARD8W9B.mx.org.scouts.eventos.reloj"
    static let tipoWidget = "mx.org.scouts.eventos.reloj.kpis"
    static let minutosRefresco: TimeInterval = 15
}

// MARK: - Sesión

struct Credenciales: Codable, Equatable {
    var jwt: String
    var token: String
    var macroEvento: String
    var api: String   // ruta base de la API, p. ej. https://apis.scouts.org.mx/api/

    init?(contexto: [String: Any]) {
        guard let jwt = contexto["jwt"] as? String, let token = contexto["token"] as? String,
              let macro = contexto["macroEvento"] as? String, let api = contexto["api"] as? String,
              !jwt.isEmpty, !token.isEmpty, !macro.isEmpty, !api.isEmpty else { return nil }
        self.jwt = jwt; self.token = token; self.macroEvento = macro; self.api = api
    }

    /// Expiración del JWT (claim `exp`); nil si el token no la trae o no se puede leer.
    var expira: Date? {
        let partes = jwt.split(separator: ".")
        guard partes.count >= 2 else { return nil }
        var b64 = partes[1].replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        b64 += String(repeating: "=", count: (4 - b64.count % 4) % 4)
        guard let datos = Data(base64Encoded: b64),
              let json = try? JSONSerialization.jsonObject(with: datos) as? [String: Any],
              let exp = (json["exp"] as? NSNumber)?.doubleValue else { return nil }
        return Date(timeIntervalSince1970: exp)
    }

    var vencida: Bool { expira.map { $0 <= Date() } ?? false }
}

/// La sesión vive en el llavero (no en UserDefaults); se puede leer tras el primer desbloqueo para que funcione en segundo plano.
enum Llavero {
    private static let servicio = "mx.org.scouts.eventos.reloj"
    private static let cuenta = "sesion"

    private static var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicio,
         kSecAttrAccount as String: cuenta, kSecAttrAccessGroup as String: Reloj.grupoLlavero]
    }

    static func guardar(_ c: Credenciales?) {
        SecItemDelete(base as CFDictionary)
        guard let c, let datos = try? JSONEncoder().encode(c) else { return }
        var item = base
        item[kSecValueData as String] = datos
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    static func leer() -> Credenciales? {
        var consulta = base
        consulta[kSecReturnData as String] = true
        consulta[kSecMatchLimit as String] = kSecMatchLimitOne
        var resultado: AnyObject?
        guard SecItemCopyMatching(consulta as CFDictionary, &resultado) == errSecSuccess, let datos = resultado as? Data else { return nil }
        return try? JSONDecoder().decode(Credenciales.self, from: datos)
    }
}

// MARK: - Datos

struct Bloque: Codable, Hashable, Identifiable {
    var dia: String
    var total: Int
    var id: String { dia }
}

struct Lugar: Codable, Hashable, Identifiable {
    var nombre: String
    var conteo: Int
    var id: String { nombre }
}

struct Resumen: Codable, Equatable {
    var macroEvento: String
    var asistencia: Int
    var registros: Int
    var kitEntregados: Int
    var kitIncluye: Int
    var comidasEntregadas: Int
    var comidas: Int
    var dias: [Bloque]
    var rankingRegistro: [Lugar]
    var rankingKit: [Lugar]
    var rankingComidas: [Lugar]
    var actualizado: Date

    static func porcentaje(_ valor: Int, _ total: Int) -> Double { total > 0 ? min(Double(valor) / Double(total), 1) : 0 }
    var pctAsistencia: Double { Self.porcentaje(asistencia, registros) }
    var pctKit: Double { Self.porcentaje(kitEntregados, kitIncluye) }
    var pctComidas: Double { Self.porcentaje(comidasEntregadas, comidas) }

    static let ejemplo = Resumen(macroEvento: "Evento", asistencia: 1234, registros: 2000, kitEntregados: 900, kitIncluye: 1500,
                                 comidasEntregadas: 3210, comidas: 6000, dias: [], rankingRegistro: [], rankingKit: [],
                                 rankingComidas: [], actualizado: Date())
}

/// Últimos KPIs consultados, en el App Group para que los lean la app y las complicaciones.
enum Cache {
    private static let clave = "relojResumen"
    private static var defaults: UserDefaults? { UserDefaults(suiteName: Reloj.grupo) }

    static func leer() -> Resumen? {
        guard let datos = defaults?.data(forKey: clave) else { return nil }
        return try? JSONDecoder().decode(Resumen.self, from: datos)
    }

    static func guardar(_ r: Resumen?) {
        if let r, let datos = try? JSONEncoder().encode(r) { defaults?.set(datos, forKey: clave) } else { defaults?.removeObject(forKey: clave) }
    }
}

// MARK: - API

enum FallaApi: Error {
    case vencida   // 401/403: hay que volver a iniciar sesión en el iPhone
    case red
}

/// Las mismas consultas que la pantalla de KPIs (DbservicesService): POST sin cuerpo, parámetros en la URL y JWT en el encabezado.
enum ApiReloj {
    private static func post<T: Decodable>(_ c: Credenciales, _ ruta: String, _ params: [String: String]) async throws -> T {
        guard var comp = URLComponents(string: c.api + ruta) else { throw FallaApi.red }
        comp.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = comp.url else { throw FallaApi.red }
        var req = URLRequest(url: url, timeoutInterval: 25)
        req.httpMethod = "POST"
        req.setValue("Bearer \(c.jwt)", forHTTPHeaderField: "Authorization")
        let (datos, resp) = try await URLSession.shared.data(for: req)
        let codigo = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if codigo == 401 || codigo == 403 { throw FallaApi.vencida }
        guard (200..<300).contains(codigo) else { throw FallaApi.red }
        return try JSONDecoder().decode(T.self, from: datos)
    }

    /// Registros y comidas son obligatorios; el avance por día y los rankings, si fallan, se dejan vacíos.
    static func consultar(_ c: Credenciales) async throws -> Resumen {
        let m = c.macroEvento
        async let reg: RepRegistros = post(c, "RegistroEvento/ReporteRegistros", ["macroevento": m, "token": c.token])
        async let com: RepComidas = post(c, "RegistroEventoComida/reporteConteoComida", ["macroEvento": m])
        async let dia: [RepDia]? = try? post(c, "RegistroEvento/ReporteporDia", ["macroevento": m, "token": c.token])
        async let rReg: [RepRanking]? = try? post(c, "RegistroEvento/ReporteRankingStaffRegistro", ["macroevento": m, "token": c.token])
        async let rKit: [RepRanking]? = try? post(c, "RegistroEvento/ReporteRankingStaffKit", ["macroevento": m, "token": c.token])
        async let rCom: [RepRanking]? = try? post(c, "RegistroEventoComida/ReporteRankingStaffComidas", ["macroevento": m, "token": c.token])
        let (r, k) = try await (reg, com)
        let top = { (l: [RepRanking]?) in (l ?? []).sorted { $0.conteo > $1.conteo }.prefix(5).map { Lugar(nombre: $0.nombre, conteo: $0.conteo) } }
        return Resumen(macroEvento: m, asistencia: r.totalAsistencia, registros: r.totalRegistros,
                       kitEntregados: r.totalEntregaKit, kitIncluye: r.totalIncluyeKit,
                       comidasEntregadas: k.comidasEntregadas, comidas: k.comidas,
                       dias: agrupar(await dia ?? []), rankingRegistro: top(await rReg), rankingKit: top(await rKit),
                       rankingComidas: top(await rCom), actualizado: Date())
    }

    /// Igual que ResumenWidgetService.guardarDia: bloques de 12 h, AM (0-11) y PM (12-23), en el orden en que llegan.
    static func agrupar(_ filas: [RepDia]) -> [Bloque] {
        var bloques: [Bloque] = []
        for f in filas {
            let texto = f.diaHora ?? ""
            let hora = texto.range(of: "\\d+", options: .regularExpression).flatMap { Int(texto[$0]) }
            let pm = texto.localizedCaseInsensitiveContains("pm")
                || (hora != nil && hora! >= 12 && !texto.localizedCaseInsensitiveContains("am"))
            let dia = String(f.dia.prefix(3))
            let etiqueta = hora == nil ? "\(dia) \(texto)".trimmingCharacters(in: .whitespaces) : "\(dia) \(pm ? "PM" : "AM")"
            if let i = bloques.firstIndex(where: { $0.dia == etiqueta }) { bloques[i].total += f.total }
            else { bloques.append(Bloque(dia: etiqueta, total: f.total)) }
        }
        return bloques
    }
}

// MARK: - Respuestas de la API (mismos campos que los modelos de Angular)

private extension KeyedDecodingContainer {
    /// Números que pueden venir como entero, decimal, texto o null.
    func entero(_ k: Key) -> Int {
        if let v = try? decodeIfPresent(Int.self, forKey: k) { return v }
        if let v = try? decodeIfPresent(Double.self, forKey: k) { return Int(v) }
        if let v = try? decodeIfPresent(String.self, forKey: k) { return Int(v) ?? 0 }
        return 0
    }
    func texto(_ k: Key) -> String? {
        if let v = try? decodeIfPresent(String.self, forKey: k) { return v }
        if let v = try? decodeIfPresent(Double.self, forKey: k) { return String(Int(v)) }
        return nil
    }
}

struct RepRegistros: Decodable {
    var totalRegistros, totalAsistencia, totalIncluyeKit, totalEntregaKit: Int
    enum CodingKeys: String, CodingKey { case totalRegistros, totalAsistencia, totalIncluyeKit, totalEntregaKit }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        totalRegistros = c.entero(.totalRegistros); totalAsistencia = c.entero(.totalAsistencia)
        totalIncluyeKit = c.entero(.totalIncluyeKit); totalEntregaKit = c.entero(.totalEntregaKit)
    }
}

struct RepComidas: Decodable {
    var comidas, comidasEntregadas: Int
    enum CodingKeys: String, CodingKey { case comidas, comidasEntregadas }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        comidas = c.entero(.comidas); comidasEntregadas = c.entero(.comidasEntregadas)
    }
}

struct RepDia: Decodable {
    var dia: String
    var diaHora: String?
    var total: Int
    enum CodingKeys: String, CodingKey { case dia, diaHora, total }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        dia = c.texto(.dia) ?? ""; diaHora = c.texto(.diaHora); total = c.entero(.total)
    }
}

struct RepRanking: Decodable {
    var nombre: String
    var conteo: Int
    enum CodingKeys: String, CodingKey { case nombre, conteo }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        nombre = c.texto(.nombre) ?? ""; conteo = c.entero(.conteo)
    }
}
