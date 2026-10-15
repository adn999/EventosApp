import UIKit
import Capacitor

/// Controlador principal: igual que CAPBridgeViewController pero registra el plugin local de la barra nativa.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeTabBarPlugin())
        bridge?.registerPluginInstance(CodigoBarrasPlugin())
        bridge?.registerPluginInstance(ResumenWidgetPlugin())
        bridge?.registerPluginInstance(SesionRelojPlugin())
    }
}

/// UITabBar con un botón transparente encima de la pestaña "Más": al tocarla abre un menú nativo (UIMenu, con el vidrio
/// del sistema) en vez de una hoja de acciones. Si iOS no expone la vista de esa pestaña, el botón se oculta y "Más"
/// vuelve a abrir la hoja de acciones desde el delegado.
final class BarraPestanas: UITabBar {
    let botonMas = UIButton(type: .custom)
    var conMas = false

    private var vistaMas: UIView? {
        guard conMas, let item = items?.last, item.responds(to: Selector(("view"))),
              let v = item.value(forKey: "view") as? UIView, v.window != nil, v.isDescendant(of: self) else { return nil }
        return v
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let v = vistaMas else { botonMas.isHidden = true; return }
        if botonMas.superview == nil { addSubview(botonMas) }
        botonMas.isHidden = false
        botonMas.frame = v.convert(v.bounds, to: self)
        bringSubviewToFront(botonMas)
    }
}

/// Barra lateral de vidrio para iPad (como la barra lateral de las apps del sistema): todas las opciones con su nombre;
/// en vertical, o con poco ancho, solo los íconos. Avisa su ancho para que la web deje ese espacio a la izquierda.
final class BarraLateral: UIView {
    struct Opcion { let id: String; let titulo: String; let imagen: UIImage?; let color: UIColor }

    var alTocar: (String) -> Void = { _ in }
    var alCambiarAncho: (CGFloat) -> Void = { _ in }
    private(set) var ancho: CGFloat = 0
    private var compacta = false
    private var seleccion: String?
    private var botones: [(id: String, boton: UIButton, color: UIColor)] = []

    private let fondo: UIVisualEffectView = {
        if #available(iOS 26.0, *) { return UIVisualEffectView(effect: UIGlassEffect(style: .regular)) }
        return UIVisualEffectView(effect: UIBlurEffect(style: .systemThinMaterialLight))
    }()
    private let scroll = UIScrollView()
    private let lista = UIStackView()
    private let pie = UIStackView()
    private lazy var anchoRestriccion = widthAnchor.constraint(equalToConstant: 76)

    init() {
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        overrideUserInterfaceStyle = .light      // igual que la barra inferior: los íconos tienen colores fijos de marca
        layer.shadowColor = UIColor(red: 35/255, green: 20/255, blue: 70/255, alpha: 1).cgColor
        layer.shadowOpacity = 0.16
        layer.shadowRadius = 18
        layer.shadowOffset = CGSize(width: 0, height: 8)

        fondo.translatesAutoresizingMaskIntoConstraints = false
        fondo.layer.cornerRadius = 28
        fondo.layer.cornerCurve = .continuous
        fondo.clipsToBounds = true
        addSubview(fondo)

        for s in [lista, pie] { s.axis = .vertical; s.spacing = 4; s.translatesAutoresizingMaskIntoConstraints = false }
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.showsVerticalScrollIndicator = false
        scroll.addSubview(lista)
        fondo.contentView.addSubview(scroll)
        fondo.contentView.addSubview(pie)

        let separador = UIView()
        separador.backgroundColor = UIColor(red: 60/255, green: 40/255, blue: 90/255, alpha: 0.12)
        separador.translatesAutoresizingMaskIntoConstraints = false
        fondo.contentView.addSubview(separador)

        let c = fondo.contentView
        NSLayoutConstraint.activate([
            anchoRestriccion,
            fondo.topAnchor.constraint(equalTo: topAnchor), fondo.bottomAnchor.constraint(equalTo: bottomAnchor),
            fondo.leadingAnchor.constraint(equalTo: leadingAnchor), fondo.trailingAnchor.constraint(equalTo: trailingAnchor),
            scroll.topAnchor.constraint(equalTo: c.topAnchor, constant: 12),
            scroll.leadingAnchor.constraint(equalTo: c.leadingAnchor, constant: 10),
            scroll.trailingAnchor.constraint(equalTo: c.trailingAnchor, constant: -10),
            separador.topAnchor.constraint(equalTo: scroll.bottomAnchor, constant: 8),
            separador.heightAnchor.constraint(equalToConstant: 1),
            separador.leadingAnchor.constraint(equalTo: c.leadingAnchor, constant: 16),
            separador.trailingAnchor.constraint(equalTo: c.trailingAnchor, constant: -16),
            pie.topAnchor.constraint(equalTo: separador.bottomAnchor, constant: 8),
            pie.leadingAnchor.constraint(equalTo: c.leadingAnchor, constant: 10),
            pie.trailingAnchor.constraint(equalTo: c.trailingAnchor, constant: -10),
            pie.bottomAnchor.constraint(equalTo: c.bottomAnchor, constant: -12),
            lista.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            lista.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            lista.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor),
            lista.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor),
        ])
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) no se usa") }

    func configurar(principales: [Opcion], pie opcionesPie: [Opcion], seleccion: String?) {
        self.seleccion = seleccion
        botones = []
        for s in [lista, pie] { s.arrangedSubviews.forEach { $0.removeFromSuperview() } }
        principales.forEach { lista.addArrangedSubview(boton($0)) }
        opcionesPie.forEach { pie.addArrangedSubview(boton($0)) }
        aplicarEstilo()
    }

    func seleccionar(_ id: String?) { seleccion = id; aplicarEstilo() }

    private func boton(_ o: Opcion) -> UIButton {
        let b = UIButton(configuration: .plain(), primaryAction: UIAction { [weak self] _ in self?.alTocar(o.id) })
        b.configuration?.image = Self.icono(o.imagen, o.color)
        b.configuration?.title = o.titulo
        b.configuration?.imagePadding = 12
        b.configuration?.baseForegroundColor = UIColor(red: 31/255, green: 22/255, blue: 51/255, alpha: 1)
        b.configuration?.cornerStyle = .large
        b.accessibilityLabel = o.titulo
        b.heightAnchor.constraint(equalToConstant: 46).isActive = true
        botones.append((o.id, b, o.color))
        return b
    }

    /// Dibuja el símbolo centrado en un cuadro fijo, para que todos los nombres empiecen a la misma altura.
    private static func icono(_ imagen: UIImage?, _ color: UIColor) -> UIImage? {
        guard let simbolo = imagen?.applyingSymbolConfiguration(UIImage.SymbolConfiguration(pointSize: 19, weight: .medium))?
            .withTintColor(color, renderingMode: .alwaysOriginal) else { return nil }
        let lado: CGFloat = 28
        return UIGraphicsImageRenderer(size: CGSize(width: lado, height: lado)).image { _ in
            let s = simbolo.size
            simbolo.draw(in: CGRect(x: (lado - s.width) / 2, y: (lado - s.height) / 2, width: s.width, height: s.height))
        }
    }

    private func aplicarEstilo() {
        for (id, b, color) in botones {
            let activo = id == seleccion
            b.configuration?.title = compacta ? nil : b.accessibilityLabel
            b.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: compacta ? 0 : 14, bottom: 0, trailing: compacta ? 0 : 10)
            b.contentHorizontalAlignment = compacta ? .center : .leading
            b.configuration?.background.backgroundColor = activo ? color.withAlphaComponent(0.18) : .clear
            b.configuration?.attributedTitle = compacta ? nil : AttributedString(b.accessibilityLabel ?? "", attributes: AttributeContainer([
                .font: UIFont.systemFont(ofSize: 16, weight: activo ? .semibold : .regular)]))
        }
    }

    /// Con nombres si hay ancho suficiente (iPad en horizontal); solo íconos si no.
    override func layoutSubviews() {
        super.layoutSubviews()
        guard let total = superview?.bounds.width, total > 0 else { return }
        let nuevaCompacta = total < 1000
        let nuevoAncho: CGFloat = nuevaCompacta ? 76 : 250
        if nuevaCompacta != compacta { compacta = nuevaCompacta; aplicarEstilo() }
        if nuevoAncho != ancho {
            ancho = nuevoAncho
            anchoRestriccion.constant = nuevoAncho
            alCambiarAncho(nuevoAncho)
        }
    }
}

/// Barra de pestañas nativa (UITabBar) sobre el WebView. En iOS 26+ toma el aspecto Liquid Glass del sistema.
/// La web manda los elementos con show(); al tocar uno se emite "tabSelected" con su id.
/// La pestaña "Más" no navega: abre un menú con las opciones de `more`.
/// Con `lateral: true` (iPad) se muestra una barra lateral con `items` arriba y `more` abajo, y se emite "anchoLateral".
@objc(NativeTabBarPlugin)
public class NativeTabBarPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeTabBarPlugin"
    public let jsName = "NativeTabBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "select", returnType: CAPPluginReturnPromise),
    ]

    private struct Entry { let id: String; let title: String; let icon: String; let color: UIColor }

    private var tabBar: BarraPestanas?
    private var lateral: BarraLateral?
    private var items: [Entry] = []
    private var more: [Entry] = []
    private var currentId: String?
    private let moreTag = -1

    private func entries(_ raw: Any?) -> [Entry] {
        (raw as? [[String: Any]] ?? []).compactMap { d in
            guard let id = d["id"] as? String, let title = d["title"] as? String else { return nil }
            return Entry(id: id, title: title, icon: d["icon"] as? String ?? "circle", color: parseColor(d["color"] as? String))
        }
    }

    private static let morado = UIColor(red: 101/255, green: 50/255, blue: 124/255, alpha: 1)

    /// Acepta "rgb(r, g, b)" (el formato que ya usa la web); si no se entiende, el morado de la app.
    private func parseColor(_ s: String?) -> UIColor {
        guard let s = s else { return Self.morado }
        let n = s.components(separatedBy: CharacterSet(charactersIn: "0123456789.").inverted)
            .filter { !$0.isEmpty }.compactMap { Double($0) }
        guard n.count >= 3 else { return Self.morado }
        return UIColor(red: n[0]/255, green: n[1]/255, blue: n[2]/255, alpha: 1)
    }

    /// Ícono con su propio color (sin dejar que la barra lo tiña): sin seleccionar un poco más tenue, seleccionado a todo color.
    /// No se baja de 0.85: sobre fondos con foto el vidrio deja pasar el color de atrás y un ícono más tenue se pierde.
    private func colored(_ name: String, _ color: UIColor, selected: Bool) -> UIImage? {
        image(name)?.withTintColor(selected ? color : color.withAlphaComponent(0.85), renderingMode: .alwaysOriginal)
    }

    private func image(_ name: String) -> UIImage? {
        UIImage(systemName: name) ?? UIImage(systemName: "circle")
    }

    /// Sin texto bajo el ícono; el nombre queda para VoiceOver. Antes de iOS 26 se baja el ícono para centrarlo en la barra.
    private func sinEtiqueta(_ item: UITabBarItem, _ nombre: String) {
        item.accessibilityLabel = nombre
        if #unavailable(iOS 26) { item.imageInsets = UIEdgeInsets(top: 6, left: 0, bottom: -6, right: 0) }
    }

    @objc func show(_ call: CAPPluginCall) {
        items = entries(call.getValue("items"))
        more = entries(call.getValue("more"))
        currentId = call.getString("selected")
        let usarLateral = call.getBool("lateral") ?? false
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController?.view else { return call.reject("sin vista") }
            if usarLateral {
                self.tabBar?.isHidden = true
                let ancho = self.mostrarLateral(en: host)
                call.resolve(["height": 0, "width": ancho])
            } else {
                self.lateral?.isHidden = true
                let alto = self.mostrarPestanas(en: host)
                call.resolve(["height": alto, "width": 0])
            }
        }
    }

    private func mostrarPestanas(en host: UIView) -> CGFloat {
        let bar = self.tabBar ?? BarraPestanas()
        if self.tabBar == nil {
            bar.delegate = self
            bar.tintColor = Self.morado
            // Siempre clara: el vidrio (Liquid Glass) se oscurece sobre contenido oscuro y los íconos, que tienen
            // colores fijos de marca, pierden contraste
            bar.overrideUserInterfaceStyle = .light
            bar.translatesAutoresizingMaskIntoConstraints = false
            bar.botonMas.showsMenuAsPrimaryAction = true
            bar.botonMas.accessibilityLabel = "Más"
            host.addSubview(bar)
            NSLayoutConstraint.activate([
                bar.leadingAnchor.constraint(equalTo: host.leadingAnchor),
                bar.trailingAnchor.constraint(equalTo: host.trailingAnchor),
                bar.bottomAnchor.constraint(equalTo: host.bottomAnchor),
            ])
            self.tabBar = bar
        }
        var tabs = items.enumerated().map { i, e -> UITabBarItem in
            let t = UITabBarItem(title: nil, image: colored(e.icon, e.color, selected: false), tag: i)
            t.selectedImage = colored(e.icon, e.color, selected: true)
            sinEtiqueta(t, e.title)
            return t
        }
        bar.conMas = !more.isEmpty
        if bar.conMas {
            let m = UITabBarItem(title: nil, image: colored("ellipsis.circle", Self.morado, selected: false), tag: moreTag)
            m.selectedImage = colored("ellipsis.circle", Self.morado, selected: true)
            sinEtiqueta(m, "Más")
            tabs.append(m)
            bar.botonMas.menu = menuMas()
        }
        bar.setItems(tabs, animated: false)
        bar.isHidden = false
        applySelection(bar)
        host.layoutIfNeeded()
        bar.setNeedsLayout()
        return bar.frame.height
    }

    private func mostrarLateral(en host: UIView) -> CGFloat {
        let barra = lateral ?? BarraLateral()
        if lateral == nil {
            host.addSubview(barra)
            let guia = host.safeAreaLayoutGuide
            NSLayoutConstraint.activate([
                barra.leadingAnchor.constraint(equalTo: guia.leadingAnchor, constant: 10),
                barra.topAnchor.constraint(equalTo: guia.topAnchor, constant: 10),
                barra.bottomAnchor.constraint(equalTo: guia.bottomAnchor, constant: -10),
            ])
            barra.alTocar = { [weak self] id in self?.notifyListeners("tabSelected", data: ["id": id]) }
            barra.alCambiarAncho = { [weak self] w in self?.notifyListeners("anchoLateral", data: ["width": w + 20]) }
            lateral = barra
        }
        let opcion = { (e: Entry) in BarraLateral.Opcion(id: e.id, titulo: e.title, imagen: self.image(e.icon), color: e.color) }
        barra.configurar(principales: items.map(opcion), pie: more.map(opcion), seleccion: currentId)
        barra.isHidden = false
        host.layoutIfNeeded()
        return barra.ancho + 20
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.tabBar?.isHidden = true
            self.lateral?.isHidden = true
            call.resolve()
        }
    }

    @objc func select(_ call: CAPPluginCall) {
        currentId = call.getString("id")
        DispatchQueue.main.async {
            if let bar = self.tabBar { self.applySelection(bar) }
            self.lateral?.seleccionar(self.currentId)
            call.resolve()
        }
    }

    /// Marca la pestaña de la ruta actual; si está dentro de "Más", marca "Más"; si no está en ninguna, ninguna.
    private func applySelection(_ bar: UITabBar) {
        guard let tabs = bar.items else { return }
        if let id = currentId, let i = items.firstIndex(where: { $0.id == id }) {
            bar.selectedItem = tabs.first { $0.tag == i }
        } else if let id = currentId, more.contains(where: { $0.id == id }) {
            bar.selectedItem = tabs.first { $0.tag == moreTag }
        } else {
            bar.selectedItem = nil
        }
    }

    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        if item.tag == moreTag {
            presentMore(from: tabBar)   // solo si no se pudo poner el menú nativo sobre la pestaña
            applySelection(tabBar)       // "Más" no cambia la pantalla: se restaura la selección
            return
        }
        guard items.indices.contains(item.tag) else { return }
        notifyListeners("tabSelected", data: ["id": items[item.tag].id])
    }

    /// Menú nativo de "Más": las opciones de navegación arriba y, en su propia sección, Salir y el cambio de menú.
    private func menuMas() -> UIMenu {
        let accion = { (e: Entry) -> UIAction in
            UIAction(title: e.title, image: self.colored(e.icon, e.color, selected: true),
                     attributes: e.id == "salir" ? .destructive : []) { [weak self] _ in
                self?.notifyListeners("tabSelected", data: ["id": e.id])
            }
        }
        let sistema = ["salir", "clasico"]
        let navegacion = more.filter { !sistema.contains($0.id) }.map(accion)
        let ajustes = more.filter { sistema.contains($0.id) }.map(accion)
        return UIMenu(children: [
            UIMenu(options: .displayInline, children: navegacion),
            UIMenu(options: .displayInline, children: ajustes),
        ])
    }

    private func presentMore(from bar: UITabBar) {
        guard let vc = bridge?.viewController else { return }
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        for e in more {
            let action = UIAlertAction(title: e.title, style: .default) { _ in
                self.notifyListeners("tabSelected", data: ["id": e.id])
            }
            action.setValue(colored(e.icon, e.color, selected: true), forKey: "image")
            sheet.addAction(action)
        }
        sheet.addAction(UIAlertAction(title: "Cancelar", style: .cancel))
        // iPad: la hoja es un popover anclado a la pestaña "Más" (la última)
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = bar
            pop.sourceRect = CGRect(x: bar.bounds.maxX - 60, y: 0, width: 50, height: bar.bounds.height)
            pop.permittedArrowDirections = .down
        }
        vc.present(sheet, animated: true)
    }
}
