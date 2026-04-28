import SwiftUI

struct OrderRequestView: View {
    private enum OrderType: String, CaseIterable, Identifiable {
        case countertop = "Новая столешница"
        case replacement = "Замена столешницы"
        case sinksAndEdges = "Мойки / кромки"
        case other = "Другое"

        var id: String { rawValue }
    }

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var name = ""
    @State private var phone = ""
    @State private var city = "Москва и МО"
    @State private var details = ""
    @State private var selectedType: OrderType = .countertop
    @State private var consentAccepted = true
    @State private var validationMessage: String?
    @State private var isSubmitted = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    headerCard

                    if isSubmitted {
                        successCard
                    } else {
                        formCard
                        submitButton
                    }
                }
                .padding(16)
            }
            .background(
                LinearGradient(
                    colors: [
                        Color(red: 0.97, green: 0.95, blue: 0.88),
                        Color.white
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            )
            .navigationTitle("Быстрая заявка")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Закрыть") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Оставьте заявку за 1 минуту")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color.black)

            Text("Мы перезвоним, уточним параметры и подскажем точную стоимость под ваш проект.")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.black.opacity(0.75))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(red: 0.97, green: 0.84, blue: 0.18))
        )
    }

    private var formCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Имя")
                    .font(.system(size: 13, weight: .semibold))
                TextField("Как к вам обращаться", text: $name)
                    .textInputAutocapitalization(.words)
                    .padding(12)
                    .background(fieldBackground)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Телефон")
                    .font(.system(size: 13, weight: .semibold))
                TextField("+7 (___) ___-__-__", text: $phone)
                    .keyboardType(.phonePad)
                    .padding(12)
                    .background(fieldBackground)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Город")
                    .font(.system(size: 13, weight: .semibold))
                TextField("Москва / Мытищи / МО", text: $city)
                    .padding(12)
                    .background(fieldBackground)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Что нужно")
                    .font(.system(size: 13, weight: .semibold))
                Picker("Тип заявки", selection: $selectedType) {
                    ForEach(OrderType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(fieldBackground)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Комментарий")
                    .font(.system(size: 13, weight: .semibold))
                TextEditor(text: $details)
                    .frame(minHeight: 96)
                    .padding(8)
                    .background(fieldBackground)
            }

            Toggle(isOn: $consentAccepted) {
                Text("Согласен на обработку данных для обратной связи")
                    .font(.system(size: 13, weight: .medium))
            }
            .tint(Color(red: 0.97, green: 0.84, blue: 0.18))

            if let validationMessage {
                Text(validationMessage)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.red)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.07), radius: 10, x: 0, y: 6)
        )
    }

    private var submitButton: some View {
        Button(action: submitRequest) {
            Text("Отправить заявку")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Color.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color(red: 0.97, green: 0.84, blue: 0.18))
                )
        }
        .buttonStyle(.plain)
    }

    private var successCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Заявка сохранена", systemImage: "checkmark.seal.fill")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Color.green)

            Text("Спасибо! Мы свяжемся с вами по номеру \(phone). Если удобно, можете позвонить нам прямо сейчас.")
                .font(.system(size: 15, weight: .medium))

            HStack(spacing: 10) {
                Button("Позвонить") {
                    callNow()
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0.97, green: 0.84, blue: 0.18))
                .foregroundStyle(Color.black)

                Button("Закрыть") {
                    dismiss()
                }
                .buttonStyle(.bordered)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.white)
                .shadow(color: Color.black.opacity(0.07), radius: 10, x: 0, y: 6)
        )
    }

    private var fieldBackground: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.black.opacity(0.14), lineWidth: 1)
            )
    }

    private func submitRequest() {
        validationMessage = nil

        let digits = phone.filter(\.isNumber)
        guard digits.count >= 10 else {
            validationMessage = "Укажите корректный номер телефона."
            return
        }

        guard consentAccepted else {
            validationMessage = "Нужно согласие на обработку данных."
            return
        }

        isSubmitted = true
    }

    private func callNow() {
        guard let url = URL(string: "tel:\(AppConfig.primaryPhoneDial)") else { return }
        openURL(url)
    }
}
