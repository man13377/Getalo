import Foundation

enum AppConfig {
    static let appName = "Getalo"

    /// Public URL of your production site. Replace with your final domain.
    static let homeURLString = "https://fifteen-vanilla-ray.tilda.ws"
    static let primaryPhoneDisplay = "8 (495) 000-00-00"
    static let primaryPhoneDial = "+74950000000"
    static let telegramURLString = "https://t.me/getalo"

    static var homeURL: URL {
        guard let url = URL(string: homeURLString) else {
            preconditionFailure("Invalid AppConfig.homeURLString: \(homeURLString)")
        }
        return url
    }

    static var telegramURL: URL? {
        URL(string: telegramURLString)
    }

    static let externalSchemes: Set<String> = [
        "tel", "mailto", "sms", "maps", "itms-apps", "itms-services", "tg", "whatsapp"
    ]
}
