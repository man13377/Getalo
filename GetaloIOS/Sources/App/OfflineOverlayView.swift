import SwiftUI

struct OfflineOverlayView: View {
    let message: String
    let onRetry: () -> Void
    let onOpenOrder: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.45)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 20, weight: .semibold))
                    Text("Сайт временно недоступен")
                        .font(.system(size: 20, weight: .bold))
                }
                .foregroundStyle(Color.black)

                Text(message)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.black.opacity(0.85))

                HStack(spacing: 10) {
                    Button("Повторить") {
                        onRetry()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.black)

                    Button("Оставить заявку") {
                        onOpenOrder()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.97, green: 0.84, blue: 0.18))
                    .foregroundStyle(Color.black)
                }
                .padding(.top, 2)
            }
            .padding(18)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color(red: 0.97, green: 0.91, blue: 0.62))
                    .shadow(color: Color.black.opacity(0.2), radius: 16, x: 0, y: 8)
            )
            .padding(24)
        }
    }
}
