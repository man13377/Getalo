import Foundation
import Combine
import WebKit

@MainActor
final class WebViewState: ObservableObject {
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var isLoading = false
    @Published var estimatedProgress: Double = 0
    @Published var currentURL: URL?
    @Published var showOfflineOverlay = false
    @Published var navigationErrorMessage = "Проверьте подключение к интернету и повторите попытку."
    @Published var isUsingBundledFallback = false

    private weak var webView: WKWebView?
    private var hasLoadedMainContent = false
    private var didAttemptOnlineBootstrap = false

    func bind(webView: WKWebView) {
        self.webView = webView
        sync(from: webView)
    }

    func isBound(to webView: WKWebView) -> Bool {
        self.webView === webView
    }

    func refreshFromPullToRefresh() {
        webView?.reload()
    }

    func navigationDidStart(on webView: WKWebView) {
        showOfflineOverlay = false
        navigationErrorMessage = "Проверьте подключение к интернету и повторите попытку."
        isUsingBundledFallback = webView.url?.isFileURL ?? false
        sync(from: webView)
    }

    func navigationDidCommit(on webView: WKWebView) {
        hasLoadedMainContent = true
        showOfflineOverlay = false
        isUsingBundledFallback = webView.url?.isFileURL ?? false
        sync(from: webView)
    }

    func navigationDidFinish(on webView: WKWebView) {
        hasLoadedMainContent = true
        showOfflineOverlay = false
        isUsingBundledFallback = webView.url?.isFileURL ?? false
        sync(from: webView)

        bootstrapOnlineIfNeeded()
    }

    func navigationDidFail(on webView: WKWebView, error: Error) {
        sync(from: webView)

        if isCanceledNavigationError(error) {
            return
        }

        guard isLikelyNetworkError(error) else {
            // Игнорируем не-сетевые ошибки (например, служебные прерывания WebView)
            // чтобы не показывать пользователю ложный офлайн-экран.
            showOfflineOverlay = false
            return
        }

        // Показываем офлайн только когда на экране еще нет контента.
        // Если сайт уже был загружен, пользователь остается на рабочей странице.
        guard !hasLoadedMainContent else {
            showOfflineOverlay = false
            return
        }

        if loadBundledFallbackSiteIfAvailable() {
            showOfflineOverlay = false
            navigationErrorMessage = "Открыта локальная версия сайта."
            return
        }

        showOfflineOverlay = true
        navigationErrorMessage = "Нет связи с интернетом. Проверьте сеть и нажмите «Повторить»."
    }

    func sync(from webView: WKWebView) {
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        isLoading = webView.isLoading
        estimatedProgress = webView.estimatedProgress
        currentURL = webView.url
    }

    func goBack() {
        webView?.goBack()
    }

    func goForward() {
        webView?.goForward()
    }

    func reload() {
        isUsingBundledFallback = false
        webView?.reload()
    }

    func retryLoading() {
        isUsingBundledFallback = false
        guard let webView else {
            goHome()
            return
        }

        if webView.url == nil {
            goHome()
            return
        }

        webView.reload()
    }

    func goHome() {
        isUsingBundledFallback = false
        hasLoadedMainContent = false
        didAttemptOnlineBootstrap = true
        webView?.load(URLRequest(url: AppConfig.homeURL))
    }

    func loadStartupContent(on webView: WKWebView, initialURL: URL) {
        // На старте показываем локальный снапшот, если он есть.
        // Это убирает "пустой экран + оффлайн карточка" при DNS-сбоях.
        if loadBundledFallbackSiteIfAvailable() {
            bootstrapOnlineIfNeeded()
            return
        }

        didAttemptOnlineBootstrap = true
        webView.load(URLRequest(url: initialURL))
    }

    @discardableResult
    private func loadBundledFallbackSiteIfAvailable() -> Bool {
        guard let webView else { return false }
        guard let snapshotURL = bundledSnapshotURL() else {
            return false
        }

        let accessRoot = snapshotURL.deletingLastPathComponent()
        webView.loadFileURL(snapshotURL, allowingReadAccessTo: accessRoot)
        hasLoadedMainContent = true
        isUsingBundledFallback = true
        return true
    }

    private func bundledSnapshotURL() -> URL? {
        if let direct = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "SiteSnapshot") {
            return direct
        }

        if let resourceRoot = Bundle.main.resourceURL {
            let candidates = [
                resourceRoot.appendingPathComponent("SiteSnapshot/index.html"),
                resourceRoot.appendingPathComponent("index.html")
            ]

            for candidate in candidates where FileManager.default.fileExists(atPath: candidate.path) {
                return candidate
            }
        }

        return nil
    }

    private func bootstrapOnlineIfNeeded() {
        guard isUsingBundledFallback else { return }
        guard !didAttemptOnlineBootstrap else { return }
        didAttemptOnlineBootstrap = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { [weak self] in
            guard let self else { return }
            guard self.isUsingBundledFallback else { return }
            self.webView?.load(URLRequest(url: AppConfig.homeURL))
        }
    }

    private func isCanceledNavigationError(_ error: Error) -> Bool {
        let nsError = error as NSError
        return nsError.domain == NSURLErrorDomain && nsError.code == URLError.cancelled.rawValue
    }

    private func isLikelyNetworkError(_ error: Error) -> Bool {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain else { return false }

        let networkErrorCodes: Set<Int> = [
            URLError.notConnectedToInternet.rawValue,
            URLError.networkConnectionLost.rawValue,
            URLError.timedOut.rawValue,
            URLError.cannotFindHost.rawValue,
            URLError.cannotConnectToHost.rawValue,
            URLError.dnsLookupFailed.rawValue,
            URLError.dataNotAllowed.rawValue,
            URLError.internationalRoamingOff.rawValue,
            URLError.secureConnectionFailed.rawValue,
            URLError.serverCertificateHasBadDate.rawValue,
            URLError.serverCertificateUntrusted.rawValue,
            URLError.serverCertificateHasUnknownRoot.rawValue,
            URLError.serverCertificateNotYetValid.rawValue,
            URLError.clientCertificateRejected.rawValue,
            URLError.clientCertificateRequired.rawValue
        ]

        return networkErrorCodes.contains(nsError.code)
    }
}
