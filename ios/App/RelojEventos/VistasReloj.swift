import SwiftUI
import Charts

let morado = Color(red: 101/255, green: 50/255, blue: 124/255)
let moradoClaro = Color(red: 176/255, green: 128/255, blue: 199/255)
let verde = Color(red: 120/255, green: 170/255, blue: 70/255)
let naranja = Color(red: 230/255, green: 150/255, blue: 60/255)

struct VistaPrincipal: View {
    @EnvironmentObject private var modelo: ModeloReloj

    var body: some View {
        if modelo.estado == .sinSesion {
            VistaAviso(icono: "iphone", titulo: "Sin sesión",
                       texto: "Inicia sesión en Eventos Scouts en tu iPhone y elige un evento.")
        } else if modelo.resumen == nil {
            if modelo.estado == .vencida {
                VistaAviso(icono: "lock", titulo: "Sesión vencida", texto: "Vuelve a entrar en la app del iPhone.")
            } else {
                ProgressView("Consultando…").task { await modelo.actualizar() }
            }
        } else {
            NavigationStack {
                TabView {
                    VistaKpis()
                    VistaAvance()
                    VistaRanking()
                }
                .tabViewStyle(.verticalPage)
            }
        }
    }
}

struct VistaAviso: View {
    let icono: String
    let titulo: String
    let texto: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icono).font(.title2).foregroundStyle(moradoClaro)
            Text(titulo).font(.headline)
            Text(texto).font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
        }
        .padding()
    }
}

/// Anillo de avance con el porcentaje al centro.
struct Anillo: View {
    let avance: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.25), lineWidth: 7)
            Circle().trim(from: 0, to: avance).stroke(color, style: StrokeStyle(lineWidth: 7, lineCap: .round)).rotationEffect(.degrees(-90))
            Text("\(Int((avance * 100).rounded()))%").font(.system(size: 15, weight: .bold, design: .rounded)).minimumScaleFactor(0.6)
        }
    }
}

/// Pie de cada pantalla: hora de la última consulta y avisos de sesión o red.
struct PieEstado: View {
    @EnvironmentObject private var modelo: ModeloReloj

    var body: some View {
        VStack(spacing: 2) {
            if modelo.estado == .vencida {
                Label("Sesión vencida: entra en el iPhone", systemImage: "lock").foregroundStyle(naranja)
            } else if modelo.sinRed {
                Label("Sin conexión", systemImage: "wifi.slash").foregroundStyle(naranja)
            }
            if let r = modelo.resumen { Text("Actualizado \(r.actualizado, style: .time)").foregroundStyle(.secondary) }
        }
        .font(.system(size: 11))
    }
}

struct VistaKpis: View {
    @EnvironmentObject private var modelo: ModeloReloj

    var body: some View {
        let r = modelo.resumen ?? .ejemplo
        ScrollView {
            VStack(spacing: 8) {
                HStack(spacing: 10) {
                    columna("Asistencia", r.pctAsistencia, moradoClaro, r.asistencia, r.registros)
                    columna("Kits", r.pctKit, verde, r.kitEntregados, r.kitIncluye)
                }
                HStack {
                    Image(systemName: "fork.knife").foregroundStyle(naranja)
                    Text("Comidas").font(.footnote)
                    Spacer()
                    Text(r.comidasEntregadas.formatted()).font(.system(.body, design: .rounded).bold())
                    if r.comidas > 0 { Text("de \(r.comidas.formatted())").font(.footnote).foregroundStyle(.secondary) }
                }
                .padding(.horizontal, 4)
                Button {
                    Task { await modelo.actualizar() }
                } label: {
                    if modelo.cargando { ProgressView() } else { Label("Recargar", systemImage: "arrow.clockwise") }
                }
                .disabled(modelo.cargando || modelo.estado == .vencida)
                PieEstado()
            }
        }
        .navigationTitle(r.macroEvento)
        .containerBackground(morado.gradient, for: .tabView)
    }

    private func columna(_ titulo: String, _ avance: Double, _ color: Color, _ valor: Int, _ total: Int) -> some View {
        VStack(spacing: 3) {
            Anillo(avance: avance, color: color).frame(width: 62, height: 62)
            Text(titulo).font(.system(size: 12, weight: .semibold))
            Text("\(valor.formatted()) / \(total.formatted())").font(.system(size: 11)).foregroundStyle(.secondary)
                .lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity)
    }
}

struct VistaAvance: View {
    @EnvironmentObject private var modelo: ModeloReloj

    var body: some View {
        let dias = Array((modelo.resumen?.dias ?? []).suffix(6))
        VStack(alignment: .leading, spacing: 4) {
            if dias.isEmpty {
                VistaAviso(icono: "chart.bar", titulo: "Avance por día", texto: "Todavía no hay registros por día.")
            } else {
                Text("Asistencia por bloque").font(.footnote).foregroundStyle(.secondary)
                Chart(dias) { b in
                    BarMark(x: .value("Bloque", b.dia), y: .value("Total", b.total))
                        .foregroundStyle(moradoClaro.gradient)
                        .annotation(position: .top) { Text(b.total.formatted(.number.notation(.compactName))).font(.system(size: 9)) }
                }
                .chartYAxis(.hidden)
                .chartXAxis { AxisMarks { _ in AxisValueLabel().font(.system(size: 8)) } }
                PieEstado()
            }
        }
        .padding(.horizontal, 4)
        .navigationTitle("Avance")
        .containerBackground(morado.gradient, for: .tabView)
    }
}

struct VistaRanking: View {
    @EnvironmentObject private var modelo: ModeloReloj

    var body: some View {
        let r = modelo.resumen
        List {
            seccion("Registro", "square.and.pencil", r?.rankingRegistro ?? [])
            seccion("Kit", "cart", r?.rankingKit ?? [])
            seccion("Alimentos", "fork.knife", r?.rankingComidas ?? [])
        }
        .navigationTitle("Ranking staff")
        .containerBackground(morado.gradient, for: .tabView)
    }

    @ViewBuilder
    private func seccion(_ titulo: String, _ icono: String, _ lugares: [Lugar]) -> some View {
        Section {
            if lugares.isEmpty {
                Text("Sin datos").font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(Array(lugares.enumerated()), id: \.offset) { i, l in
                HStack {
                    Text("\(i + 1)").font(.footnote.bold()).foregroundStyle(moradoClaro).frame(width: 16)
                    Text(l.nombre.capitalized).font(.footnote).lineLimit(2)
                    Spacer()
                    Text(l.conteo.formatted()).font(.footnote.bold())
                }
            }
        } header: {
            Label(titulo, systemImage: icono)
        }
    }
}
