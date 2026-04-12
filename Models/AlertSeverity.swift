import SwiftUI

enum AlertSeverity: String, CaseIterable, Codable, Identifiable {
    case critical
    case high
    case elevated
    case moderate

    var id: String { rawValue }

    var displayName: String {
        rawValue.capitalized
    }

    var color: Color {
        switch self {
        case .critical:
            return Color(red: 0.76, green: 0.12, blue: 0.11)
        case .high:
            return Color(red: 0.90, green: 0.39, blue: 0.10)
        case .elevated:
            return Color(red: 0.87, green: 0.67, blue: 0.16)
        case .moderate:
            return Color(red: 0.16, green: 0.47, blue: 0.48)
        }
    }
}
