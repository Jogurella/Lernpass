import Foundation
import Capacitor
import Security
import UIKit

@objc(LernpassNativePlugin)
public class LernpassNativePlugin: CAPPlugin, CAPBridgedPlugin, URLSessionTaskDelegate {
    public let identifier = "LernpassNativePlugin"
    public let jsName = "LernpassNative"
    public let pluginMethods: [CAPPluginMethod] = [
        "loadStorage", "saveStorage", "configureServer", "hasToken", "clearToken",
        "apiRequest", "backupStorage", "openExternal", "appUpdate", "signatureInfo"
    ].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private let queue = DispatchQueue(label: "at.lernpass.storage")
    private var folder: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Lernpass", isDirectory: true)
    }
    private func readValues() throws -> [String: String] {
        let file = folder.appendingPathComponent("storage.json")
        guard FileManager.default.fileExists(atPath: file.path) else { return [:] }
        return try JSONDecoder().decode([String: String].self, from: Data(contentsOf: file))
    }
    private func writeValues(_ values: [String: String]) throws {
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let bytes = try JSONEncoder().encode(values)
        guard bytes.count <= 12 * 1024 * 1024 else { throw failure("Der lokale Speicher ist voll. Exportiere eine Sicherung.") }
        let file = folder.appendingPathComponent("storage.json")
        if FileManager.default.fileExists(atPath: file.path) {
            try Data(contentsOf: file).write(to: folder.appendingPathComponent("storage.previous.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        }
        try bytes.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    private func failure(_ text: String) -> NSError { NSError(domain: "Lernpass", code: 1, userInfo: [NSLocalizedDescriptionKey: text]) }
    private func validated(_ value: String) throws -> URL {
        guard let parts = URLComponents(string: value), parts.scheme == "https", parts.host != nil,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
              parts.path.isEmpty || parts.path == "/", let url = parts.url else { throw failure("Bitte eine gültige HTTPS-Serveradresse eingeben.") }
        return url
    }
    private func server() throws -> URL {
        guard let value = try readValues()["lernpass.server"] else { throw failure("Verbinde zuerst einen Lernpass-Server.") }
        return try validated(value)
    }
    private func tokenQuery(_ origin: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "at.lernpass.mec", kSecAttrAccount as String: origin]
    }
    private func token(_ origin: String) -> String? {
        var query = tokenQuery(origin)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var value: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess, let bytes = value as? Data else { return nil }
        return String(data: bytes, encoding: .utf8)
    }
    private func saveToken(_ value: String, origin: String) throws {
        let query = tokenQuery(origin), data = Data(value.utf8)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var insert = query
            insert[kSecValueData as String] = data
            insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(insert as CFDictionary, nil) == errSecSuccess else { throw failure("Die Gerätekennung konnte nicht im Schlüsselbund gespeichert werden.") }
        } else if status != errSecSuccess { throw failure("Der Schlüsselbund ist momentan nicht verfügbar.") }
    }
    private func reject(_ call: CAPPluginCall, _ error: Error) { DispatchQueue.main.async { call.reject(error.localizedDescription) } }
    @objc func loadStorage(_ call: CAPPluginCall) { queue.async { do { let values = try self.readValues(); call.resolve(["values": values]) } catch { self.reject(call, error) } } }
    @objc func saveStorage(_ call: CAPPluginCall) { queue.async { do { guard let values = call.getObject("values") as? [String: String] else { throw self.failure("Ungültige Speicherdaten.") }; try self.writeValues(values); call.resolve() } catch { self.reject(call, error) } } }
    @objc func configureServer(_ call: CAPPluginCall) { queue.async { do { let url = try self.validated(call.getString("url") ?? ""); var values = try self.readValues(); values["lernpass.server"] = url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")); try self.writeValues(values); call.resolve() } catch { self.reject(call, error) } } }
    @objc func hasToken(_ call: CAPPluginCall) { queue.async { let origin = try? self.readValues()["lernpass.server"]; call.resolve(["hasToken": origin.flatMap { self.token($0) } != nil]) } }
    @objc func clearToken(_ call: CAPPluginCall) { queue.async { do { guard let origin = try self.readValues()["lernpass.server"] else { call.resolve(); return }; let status = SecItemDelete(self.tokenQuery(origin) as CFDictionary); guard status == errSecSuccess || status == errSecItemNotFound else { throw self.failure("Die Gerätekennung konnte nicht entfernt werden.") }; call.resolve() } catch { self.reject(call, error) } } }
    @objc func backupStorage(_ call: CAPPluginCall) { queue.async { do { let values = try self.readValues(), directory = self.folder.appendingPathComponent("Backups", isDirectory: true); try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true); let file = directory.appendingPathComponent("Lernpass-\(Int(Date().timeIntervalSince1970)).json"); try JSONEncoder().encode(values).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]); call.resolve(["saved": true]) } catch { self.reject(call, error) } } }
    @objc func apiRequest(_ call: CAPPluginCall) {
        queue.async {
            do {
                let path = call.getString("path") ?? "", method = call.getString("method") ?? "GET"
                guard path.range(of: "^/api/[a-zA-Z0-9_/-]+$", options: .regularExpression) != nil,
                      ["GET", "HEAD", "POST", "PUT", "DELETE"].contains(method) else { throw self.failure("Ungültiger App-Aufruf.") }
                let origin = try self.readValues()["lernpass.server"] ?? "", base = try self.validated(origin)
                guard let url = URL(string: path, relativeTo: base)?.absoluteURL else { throw self.failure("Ungültige Serveradresse.") }
                var request = URLRequest(url: url); request.httpMethod = method; request.timeoutInterval = 55
                if let token = self.token(origin) { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
                if let mime = call.getString("contentType") { request.setValue(mime, forHTTPHeaderField: "Content-Type") }
                if let id = call.getString("caseId") { request.setValue(id, forHTTPHeaderField: "X-Case-Id") }
                if let name = call.getString("imageName") { request.setValue(name, forHTTPHeaderField: "X-Image-Name") }
                if let encoded = call.getString("bodyBase64") { request.httpBody = Data(base64Encoded: encoded) }
                else if let body = call.getString("body") { request.httpBody = Data(body.utf8) }
                guard (request.httpBody?.count ?? 0) <= 5 * 1024 * 1024 else { throw self.failure("Die Datei ist zu groß.") }
                let session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
                session.dataTask(with: request) { data, response, error in
                    defer { session.finishTasksAndInvalidate() }
                    do {
                        if error != nil { throw self.failure("Der Server ist nicht erreichbar. Dein Stand bleibt auf diesem Gerät.") }
                        guard let response = response as? HTTPURLResponse, var bytes = data, bytes.count <= 8 * 1024 * 1024 else { throw self.failure("Der Server hat keine gültige Antwort gesendet.") }
                        var paired = false
                        if response.statusCode == 201 && ["/api/account", "/api/pair/claim"].contains(path) {
                            guard var value = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                                  let token = value.removeValue(forKey: "token") as? String,
                                  token.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else { throw self.failure("Ungültige Gerätekennung.") }
                            try self.saveToken(token, origin: origin)
                            bytes = try JSONSerialization.data(withJSONObject: value); paired = true
                        }
                        var headers: [String: String] = [:]
                        for (key, value) in response.allHeaderFields { headers[String(describing: key).lowercased()] = String(describing: value) }
                        call.resolve(["status": response.statusCode, "headers": headers, "bodyBase64": bytes.base64EncodedString(), "paired": paired])
                    } catch { self.reject(call, error) }
                }.resume()
            } catch { self.reject(call, error) }
        }
    }
    public func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    @objc func openExternal(_ call: CAPPluginCall) {
        guard let value = call.getString("url"), let url = URL(string: value), ["https", "http", "sidestore", "altstore"].contains(url.scheme ?? "") else { call.reject("Ungültiger Link."); return }
        DispatchQueue.main.async { UIApplication.shared.open(url, options: [:]) { opened in call.resolve(["opened": opened]) } }
    }
    @objc func signatureInfo(_ call: CAPPluginCall) {
        guard let file = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"), let bytes = try? Data(contentsOf: file),
              let start = bytes.range(of: Data("<?xml".utf8)), let end = bytes.range(of: Data("</plist>".utf8)),
              let info = try? PropertyListSerialization.propertyList(from: bytes.subdata(in: start.lowerBound..<end.upperBound), format: nil) as? [String: Any], let expiry = info["ExpirationDate"] as? Date else { call.resolve(["available": false]); return }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: expiry).day ?? 0
        call.resolve(["available": true, "daysRemaining": days, "expiresAt": ISO8601DateFormatter().string(from: expiry)])
    }
    @objc func appUpdate(_ call: CAPPluginCall) {
        if call.getString("action") == "install" {
            DispatchQueue.main.async {
                guard let url = URL(string: "sidestore://") else { call.reject("Öffne SideStore und aktualisiere Lernpass unter Meine Apps."); return }
                UIApplication.shared.open(url, options: [:]) { opened in
                    if opened { call.resolve(["opened": true]) }
                    else { call.reject("Öffne SideStore und aktualisiere Lernpass unter Meine Apps. Füge bei Bedarf die Lernpass-Quelle aus der Anleitung hinzu.") }
                }
            }
            return
        }
        guard let configURL = Bundle.main.url(forResource: "release-config", withExtension: "json", subdirectory: "public"),
              let data = try? Data(contentsOf: configURL), let config = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let source = config["sourceUrl"] as? String, let url = URL(string: source), url.scheme == "https" else { call.resolve(["configured": false, "available": false]); return }
        URLSession.shared.dataTask(with: url) { bytes, response, error in
            guard error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200, let bytes = bytes,
                  let source = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  let apps = source["apps"] as? [[String: Any]] else { call.reject("Die SideStore-Quelle ist momentan nicht erreichbar."); return }
            guard let app = apps.first(where: { $0["bundleIdentifier"] as? String == "at.lernpass.mec" }), let versions = app["versions"] as? [[String: Any]], let latest = versions.first, let version = latest["version"] as? String else { call.resolve(["configured": true, "available": false]); return }
            let current = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.7.0"
            call.resolve(["configured": true, "available": version.compare(current, options: .numeric) == .orderedDescending, "version": version, "date": latest["date"] as? String ?? "", "size": latest["size"] as? Int ?? 0, "body": latest["localizedDescription"] as? String ?? "", "sourceUrl": url.absoluteString])
        }.resume()
    }
}
