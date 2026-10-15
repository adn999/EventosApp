import UIKit
import AVFoundation
import Capacitor

/// Escáner de códigos de barras con la cámara (AVFoundation). Lee SOLO Code 128 y Code 39; ignora QR y demás.
/// escanear() → { valor } al leer un código, o { cancelado: true } si el usuario cierra la cámara.
/// Escaneo continuo: iniciarContinuo({ titulo }) deja la cámara abierta y emite "codigoContinuo" { valor } por cada lectura;
/// la web contesta con mostrarResultado({ tipo: ok|ya|error, titulo, detalle }) y la cámara sigue leyendo.
/// Al cerrarla el usuario se emite "continuoCerrado".
/// Se usa AVFoundation y no VisionKit porque la linterna debe manejarse dentro de la misma sesión de cámara:
/// con el escáner de VisionKit, encenderla desde fuera congelaba la imagen.
@objc(CodigoBarrasPlugin)
public class CodigoBarrasPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CodigoBarrasPlugin"
    public let jsName = "CodigoBarras"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "escanear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "iniciarContinuo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mostrarResultado", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "detenerContinuo", returnType: CAPPluginReturnPromise),
    ]

    private weak var continuo: EscanerViewController?

    @objc func escanear(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil else {
                return call.reject("Este dispositivo no tiene cámara", "NO_DISPONIBLE")
            }
            AVCaptureDevice.requestAccess(for: .video) { permitido in
                DispatchQueue.main.async {
                    guard permitido else { return call.reject("Sin permiso de cámara", "PERMISO") }
                    guard let host = self.bridge?.viewController else {
                        return call.reject("El escáner no está disponible", "NO_DISPONIBLE")
                    }
                    let vc = EscanerViewController { valor in
                        if let valor = valor { call.resolve(["valor": valor]) } else { call.resolve(["cancelado": true]) }
                    }
                    vc.modalPresentationStyle = .fullScreen
                    host.present(vc, animated: true)
                }
            }
        }
    }

    @objc func iniciarContinuo(_ call: CAPPluginCall) {
        let titulo = call.getString("titulo") ?? "Escaneo continuo"
        DispatchQueue.main.async {
            guard AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil else {
                return call.reject("Este dispositivo no tiene cámara", "NO_DISPONIBLE")
            }
            AVCaptureDevice.requestAccess(for: .video) { permitido in
                DispatchQueue.main.async {
                    guard permitido else { return call.reject("Sin permiso de cámara", "PERMISO") }
                    guard let host = self.bridge?.viewController else {
                        return call.reject("El escáner no está disponible", "NO_DISPONIBLE")
                    }
                    let vc = EscanerViewController(titulo: titulo, alLeer: { [weak self] valor in
                        self?.notifyListeners("codigoContinuo", data: ["valor": valor])
                    }, alTerminar: { [weak self] _ in
                        self?.notifyListeners("continuoCerrado", data: [:])
                    })
                    // overFullScreen: la vista web sigue en pantalla (debajo) y su JavaScript procesa cada código;
                    // con fullScreen iOS la quita de la ventana y pausa la web mientras la cámara está abierta
                    vc.modalPresentationStyle = .overFullScreen
                    self.continuo = vc
                    host.present(vc, animated: true) { call.resolve() }
                }
            }
        }
    }

    @objc func mostrarResultado(_ call: CAPPluginCall) {
        let tipo = call.getString("tipo") ?? "error"
        let titulo = call.getString("titulo") ?? ""
        let detalle = call.getString("detalle") ?? ""
        DispatchQueue.main.async {
            self.continuo?.mostrarResultado(tipo: tipo, titulo: titulo, detalle: detalle)
            call.resolve()
        }
    }

    @objc func detenerContinuo(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.continuo?.cerrar()
            call.resolve()
        }
    }
}

final class EscanerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private let sesion = AVCaptureSession()
    private let colaSesion = DispatchQueue(label: "mx.org.scouts.eventos.escaner")
    private let camara = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
    private var vista: AVCaptureVideoPreviewLayer?
    private let alTerminar: (String?) -> Void
    private var terminado = false
    private var linterna = UIButton()
    private var linternaEncendida = false
    private var zoomInicial: CGFloat = 1

    // Escaneo continuo: la cámara no se cierra; cada código se manda a la web y se muestra su resultado en la tarjeta
    private let tituloContinuo: String?
    private let alLeer: ((String) -> Void)?
    private var esContinuo: Bool { alLeer != nil }
    private var esperando = false                 // hay un código en proceso: no se lee otro hasta tener su resultado
    private var ultimoValor = ""
    private var ultimaLectura = Date.distantPast
    private var correctos = 0
    private var limiteEspera: DispatchWorkItem?
    private let tarjeta: UIVisualEffectView = {
        if #available(iOS 26.0, *) { return UIVisualEffectView(effect: UIGlassEffect(style: .regular)) }
        return UIVisualEffectView(effect: UIBlurEffect(style: .systemThickMaterialDark))
    }()
    private let iconoResultado = UIImageView()
    private let codigoResultado = UILabel()       // código leído: se queda junto al resultado hasta la siguiente lectura o Limpiar
    private let tituloResultado = UILabel()
    private let detalleResultado = UILabel()
    private let contador = UILabel()

    init(alTerminar: @escaping (String?) -> Void) {
        self.alTerminar = alTerminar
        self.tituloContinuo = nil
        self.alLeer = nil
        super.init(nibName: nil, bundle: nil)
    }

    init(titulo: String, alLeer: @escaping (String) -> Void, alTerminar: @escaping (String?) -> Void) {
        self.alTerminar = alTerminar
        self.tituloContinuo = titulo
        self.alLeer = alLeer
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configurarSesion()
        configurarControles()
        view.addGestureRecognizer(UIPinchGestureRecognizer(target: self, action: #selector(pellizco(_:))))
        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tocarParaEnfocar(_:))))
    }

    private func configurarSesion() {
        guard let cam = camara, let entrada = try? AVCaptureDeviceInput(device: cam), sesion.canAddInput(entrada) else { return }
        sesion.beginConfiguration()
        if sesion.canSetSessionPreset(.hd1920x1080) { sesion.sessionPreset = .hd1920x1080 }
        sesion.addInput(entrada)
        let salida = AVCaptureMetadataOutput()
        if sesion.canAddOutput(salida) {
            sesion.addOutput(salida)
            salida.setMetadataObjectsDelegate(self, queue: .main)
            let permitidos: [AVMetadataObject.ObjectType] = [.code128, .code39, .code39Mod43]
            salida.metadataObjectTypes = permitidos.filter { salida.availableMetadataObjectTypes.contains($0) }
        }
        sesion.commitConfiguration()

        // Enfoque continuo y cercano: los códigos de las pulseras se leen a pocos centímetros
        if (try? cam.lockForConfiguration()) != nil {
            if cam.isFocusModeSupported(.continuousAutoFocus) { cam.focusMode = .continuousAutoFocus }
            if cam.isAutoFocusRangeRestrictionSupported { cam.autoFocusRangeRestriction = .near }
            cam.unlockForConfiguration()
        }

        let capa = AVCaptureVideoPreviewLayer(session: sesion)
        capa.videoGravity = .resizeAspectFill
        capa.frame = view.bounds
        view.layer.insertSublayer(capa, at: 0)
        vista = capa
    }

    private func configurarControles() {
        let texto = UILabel()
        texto.text = tituloContinuo ?? "Apunta al código de barras"
        texto.textColor = .white
        texto.font = .systemFont(ofSize: 16, weight: .medium)
        texto.textAlignment = .center
        texto.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        texto.layer.cornerRadius = 14
        texto.clipsToBounds = true

        var config = UIButton.Configuration.filled()
        config.title = esContinuo ? "Terminar" : "Cancelar"
        config.baseBackgroundColor = UIColor.black.withAlphaComponent(0.55)
        config.baseForegroundColor = .white
        config.cornerStyle = .capsule
        let cancelar = UIButton(configuration: config, primaryAction: UIAction { [weak self] _ in self?.terminar(nil) })

        // Linterna: solo si el dispositivo tiene flash
        var cfgLinterna = UIButton.Configuration.filled()
        cfgLinterna.image = UIImage(systemName: "flashlight.off.fill")
        cfgLinterna.baseBackgroundColor = UIColor.black.withAlphaComponent(0.55)
        cfgLinterna.baseForegroundColor = .white
        cfgLinterna.cornerStyle = .capsule
        linterna = UIButton(configuration: cfgLinterna, primaryAction: UIAction { [weak self] _ in self?.alternarLinterna() })
        linterna.isHidden = !(camara?.hasTorch ?? false)
        linterna.accessibilityLabel = "Linterna"

        // Continuo: Limpiar quita de la tarjeta lo del último escaneo
        var cfgLimpiar = config
        cfgLimpiar.title = "Limpiar"
        let limpiar = UIButton(configuration: cfgLimpiar, primaryAction: UIAction { [weak self] _ in self?.limpiar() })
        limpiar.isHidden = !esContinuo

        // Limpiar · Terminar · linterna, centrados (los ocultos no ocupan lugar)
        let botones = UIStackView(arrangedSubviews: [limpiar, cancelar, linterna])
        botones.axis = .horizontal
        botones.spacing = 12
        botones.alignment = .center

        [texto, botones].forEach { $0.translatesAutoresizingMaskIntoConstraints = false; view.addSubview($0) }
        NSLayoutConstraint.activate([
            texto.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            texto.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            texto.widthAnchor.constraint(equalToConstant: 260),
            texto.heightAnchor.constraint(equalToConstant: 34),
            botones.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            botones.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            limpiar.widthAnchor.constraint(equalToConstant: 120),
            limpiar.heightAnchor.constraint(equalToConstant: 48),
            cancelar.widthAnchor.constraint(equalToConstant: esContinuo ? 140 : 160),
            cancelar.heightAnchor.constraint(equalToConstant: 48),
            linterna.widthAnchor.constraint(equalToConstant: 48),
            linterna.heightAnchor.constraint(equalToConstant: 48),
        ])
        if esContinuo { configurarTarjeta(sobre: botones, debajoDe: texto) }
    }

    /// Tarjeta de resultado (arriba de "Terminar") y contador de lecturas correctas (debajo del título).
    private func configurarTarjeta(sobre boton: UIView, debajoDe titulo: UIView) {
        ajustarAncho(titulo, 300)
        tarjeta.layer.cornerRadius = 26
        tarjeta.layer.cornerCurve = .continuous
        tarjeta.clipsToBounds = true
        tarjeta.overrideUserInterfaceStyle = .dark
        iconoResultado.contentMode = .scaleAspectFit
        iconoResultado.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 30, weight: .semibold)
        tituloResultado.font = .systemFont(ofSize: 19, weight: .semibold)
        tituloResultado.textColor = .white
        tituloResultado.numberOfLines = 2
        detalleResultado.font = .systemFont(ofSize: 15)
        detalleResultado.textColor = UIColor.white.withAlphaComponent(0.85)
        detalleResultado.numberOfLines = 4   // datos del usuario + sus eventos
        codigoResultado.font = .monospacedSystemFont(ofSize: 14, weight: .semibold)
        codigoResultado.textColor = UIColor.white.withAlphaComponent(0.9)
        codigoResultado.isHidden = true
        let textos = UIStackView(arrangedSubviews: [codigoResultado, tituloResultado, detalleResultado])
        textos.axis = .vertical
        textos.spacing = 3
        let fila = UIStackView(arrangedSubviews: [iconoResultado, textos])
        fila.spacing = 14
        fila.alignment = .center
        fila.translatesAutoresizingMaskIntoConstraints = false
        tarjeta.contentView.addSubview(fila)

        contador.font = .monospacedDigitSystemFont(ofSize: 15, weight: .semibold)
        contador.textColor = .white
        contador.textAlignment = .center
        contador.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.75)
        contador.layer.cornerRadius = 14
        contador.clipsToBounds = true
        contador.isHidden = true

        [tarjeta, contador].forEach { $0.translatesAutoresizingMaskIntoConstraints = false; view.addSubview($0) }
        NSLayoutConstraint.activate([
            tarjeta.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            tarjeta.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            tarjeta.bottomAnchor.constraint(equalTo: boton.topAnchor, constant: -18),
            tarjeta.heightAnchor.constraint(greaterThanOrEqualToConstant: 86),
            fila.leadingAnchor.constraint(equalTo: tarjeta.contentView.leadingAnchor, constant: 18),
            fila.trailingAnchor.constraint(equalTo: tarjeta.contentView.trailingAnchor, constant: -18),
            fila.topAnchor.constraint(equalTo: tarjeta.contentView.topAnchor, constant: 14),
            fila.bottomAnchor.constraint(equalTo: tarjeta.contentView.bottomAnchor, constant: -14),
            iconoResultado.widthAnchor.constraint(equalToConstant: 38),
            contador.topAnchor.constraint(equalTo: titulo.bottomAnchor, constant: 10),
            contador.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            contador.heightAnchor.constraint(equalToConstant: 28),
            contador.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
        ])
        pintarTarjeta(icono: "barcode.viewfinder", color: .white, titulo: "Listo para escanear", detalle: "Apunta a la pulsera o al CUM")
    }

    private func ajustarAncho(_ v: UIView, _ ancho: CGFloat) {
        v.constraints.filter { $0.firstAttribute == .width }.forEach { $0.constant = ancho }
    }

    private func pintarTarjeta(icono: String, color: UIColor, titulo: String, detalle: String) {
        iconoResultado.image = UIImage(systemName: icono)
        iconoResultado.tintColor = color
        tituloResultado.text = titulo
        detalleResultado.text = detalle
        detalleResultado.isHidden = detalle.isEmpty
        tarjeta.contentView.backgroundColor = color == .white ? .clear : color.withAlphaComponent(0.28)
    }

    /// Resultado que manda la web para el código en proceso; tras una pausa corta se puede leer el siguiente.
    func mostrarResultado(tipo: String, titulo: String, detalle: String) {
        limiteEspera?.cancel()
        switch tipo {
        case "ok":
            correctos += 1
            contador.text = "  \u{2713} \(correctos) \(correctos == 1 ? "lectura" : "lecturas")  "
            contador.isHidden = false
            pintarTarjeta(icono: "checkmark.circle.fill", color: .systemGreen, titulo: titulo, detalle: detalle)
        case "ya":
            pintarTarjeta(icono: "exclamationmark.triangle.fill", color: .systemOrange, titulo: titulo, detalle: detalle)
        default:
            pintarTarjeta(icono: "xmark.octagon.fill", color: .systemRed, titulo: titulo, detalle: detalle)
        }
        UIView.animate(withDuration: 0.12, animations: { self.tarjeta.transform = CGAffineTransform(scaleX: 1.03, y: 1.03) }) { _ in
            UIView.animate(withDuration: 0.18) { self.tarjeta.transform = .identity }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in self?.esperando = false }
    }

    /// Quita de la tarjeta lo del último escaneo; la misma pulsera se puede volver a leer de inmediato.
    private func limpiar() {
        ultimoValor = ""
        codigoResultado.isHidden = true
        pintarTarjeta(icono: "barcode.viewfinder", color: .white, titulo: "Listo para escanear", detalle: "Apunta a la pulsera o al CUM")
    }

    /// Lo llama la web al salir de la pantalla.
    func cerrar() { terminar(nil) }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        vista?.frame = view.bounds
        // la vista de la cámara gira con el iPad
        if let conexion = vista?.connection, let orientacion = view.window?.windowScene?.interfaceOrientation {
            let grados: CGFloat
            switch orientacion {
            case .landscapeLeft: grados = 180
            case .landscapeRight: grados = 0
            case .portraitUpsideDown: grados = 270
            default: grados = 90
            }
            if conexion.isVideoRotationAngleSupported(grados) { conexion.videoRotationAngle = grados }
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        colaSesion.async { [sesion] in if !sesion.isRunning { sesion.startRunning() } }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objetos: [AVMetadataObject], from connection: AVCaptureConnection) {
        for objeto in objetos {
            if let codigo = objeto as? AVMetadataMachineReadableCodeObject, let valor = codigo.stringValue, !valor.isEmpty {
                guard let alLeer = alLeer else { return terminar(valor) }
                // Continuo: uno a la vez, y la misma pulsera no se repite si sigue frente a la cámara
                if esperando || (valor == ultimoValor && Date().timeIntervalSince(ultimaLectura) < 4) { return }
                esperando = true
                ultimoValor = valor
                ultimaLectura = Date()
                codigoResultado.text = "Escaneado: \(valor)"
                codigoResultado.isHidden = false
                pintarTarjeta(icono: "hourglass", color: .white, titulo: "Consultando…", detalle: "")
                // Si la web no contesta, se libera la cámara para no quedarse trabada
                let limite = DispatchWorkItem { [weak self] in
                    self?.mostrarResultado(tipo: "error", titulo: "Sin respuesta", detalle: "Revisa la conexión e intenta de nuevo")
                }
                limiteEspera = limite
                DispatchQueue.main.asyncAfter(deadline: .now() + 12, execute: limite)
                alLeer(valor)
                return
            }
        }
    }

    // MARK: - Linterna, zoom y enfoque

    private func alternarLinterna() {
        guard let cam = camara, cam.hasTorch, (try? cam.lockForConfiguration()) != nil else { return }
        if linternaEncendida { cam.torchMode = .off } else { try? cam.setTorchModeOn(level: 0.6) }
        cam.unlockForConfiguration()
        linternaEncendida.toggle()
        linterna.configuration?.image = UIImage(systemName: linternaEncendida ? "flashlight.on.fill" : "flashlight.off.fill")
        linterna.configuration?.baseBackgroundColor = linternaEncendida ? UIColor.systemYellow.withAlphaComponent(0.85) : UIColor.black.withAlphaComponent(0.55)
        linterna.configuration?.baseForegroundColor = linternaEncendida ? .black : .white
    }

    @objc private func pellizco(_ g: UIPinchGestureRecognizer) {
        guard let cam = camara else { return }
        if g.state == .began { zoomInicial = cam.videoZoomFactor }
        guard (try? cam.lockForConfiguration()) != nil else { return }
        cam.videoZoomFactor = max(1, min(zoomInicial * g.scale, min(cam.activeFormat.videoMaxZoomFactor, 6)))
        cam.unlockForConfiguration()
    }

    @objc private func tocarParaEnfocar(_ g: UITapGestureRecognizer) {
        guard let cam = camara, let capa = vista, cam.isFocusPointOfInterestSupported,
              (try? cam.lockForConfiguration()) != nil else { return }
        cam.focusPointOfInterest = capa.captureDevicePointConverted(fromLayerPoint: g.location(in: view))
        cam.focusMode = .continuousAutoFocus
        cam.unlockForConfiguration()
    }

    // MARK: - Cierre

    private func terminar(_ valor: String?) {
        guard !terminado else { return }
        terminado = true
        limiteEspera?.cancel()
        if linternaEncendida, let cam = camara, (try? cam.lockForConfiguration()) != nil {
            cam.torchMode = .off
            cam.unlockForConfiguration()
        }
        colaSesion.async { [sesion] in sesion.stopRunning() }
        dismiss(animated: true) { self.alTerminar(valor) }
    }
}
