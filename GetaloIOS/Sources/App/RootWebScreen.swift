import SwiftUI
import UIKit

struct RootWebScreen: View {
    @StateObject private var webState = WebViewState()
    @State private var showOrderSheet = false

    var body: some View {
        ZStack(alignment: .top) {
            WebViewContainer(initialURL: AppConfig.homeURL, state: webState)
                .ignoresSafeArea(edges: .top)

            if webState.isUsingBundledFallback {
                HStack(spacing: 10) {
                    Image(systemName: "externaldrive.fill.badge.exclamationmark")
                        .foregroundStyle(Color.black)
                    Text("Локальная версия сайта")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.black)

                    Spacer(minLength: 8)

                    Button("Проверить онлайн") {
                        webState.goHome()
                    }
                    .font(.system(size: 12, weight: .bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(Color.black.opacity(0.1))
                    )
                    .foregroundStyle(Color.black)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color(red: 0.97, green: 0.84, blue: 0.18))
                        .shadow(color: Color.black.opacity(0.12), radius: 8, x: 0, y: 4)
                )
                .padding(.horizontal, 10)
                .padding(.top, 6)
            }

            if webState.isLoading {
                ProgressView(value: max(0.05, webState.estimatedProgress))
                    .progressViewStyle(.linear)
                    .tint(Color.yellow)
                    .padding(.horizontal, 8)
                    .padding(.top, webState.isUsingBundledFallback ? 60 : 2)
            }

            if webState.showOfflineOverlay {
                OfflineOverlayView(
                    message: webState.navigationErrorMessage,
                    onRetry: {
                        webState.retryLoading()
                    },
                    onOpenOrder: {
                        showOrderSheet = true
                    }
                )
                .transition(.opacity)
            }
        }
        .safeAreaInset(edge: .bottom) {
            WebBottomBar(
                state: webState,
                onOpenOrder: {
                    showOrderSheet = true
                }
            )
        }
        .animation(.easeInOut(duration: 0.2), value: webState.showOfflineOverlay)
        .sheet(isPresented: $showOrderSheet) {
            OrderRequestView()
        }
    }
}

private struct WebBottomBar: View {
    @ObservedObject var state: WebViewState
    let onOpenOrder: () -> Void

    var body: some View {
        HStack(spacing: 18) {
            barButton(systemImage: "house.fill", title: "Главная", isEnabled: true) {
                state.goHome()
            }

            barButton(systemImage: "chevron.backward", title: "Назад", isEnabled: state.canGoBack) {
                state.goBack()
            }

            barButton(systemImage: "chevron.forward", title: "Вперед", isEnabled: state.canGoForward) {
                state.goForward()
            }

            barButton(systemImage: "arrow.clockwise", title: "Обновить", isEnabled: true) {
                state.reload()
            }

            barButton(systemImage: "square.and.pencil", title: "Заявка", isEnabled: true) {
                onOpenOrder()
            }

            barButton(systemImage: "safari.fill", title: "Safari", isEnabled: true) {
                if let url = state.currentURL ?? URL(string: AppConfig.homeURLString) {
                    UIApplication.shared.open(url)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.black.opacity(0.08))
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private func barButton(systemImage: String, title: String, isEnabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: systemImage)
                    .font(.system(size: 17, weight: .semibold))
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(isEnabled ? Color.primary : Color.gray)
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled)
    }
}
