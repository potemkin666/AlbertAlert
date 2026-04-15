import Foundation

struct WatchlistItem: Identifiable, Codable, Hashable {
    let id: UUID
    let title: String
    let focusArea: String
    let region: TerrorAlert.Region
    let keywords: [String]
    let isActive: Bool
}
