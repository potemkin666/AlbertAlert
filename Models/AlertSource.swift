import Foundation

struct AlertSource: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let provider: String
    let kind: FeedKind
    let endpoint: String
    let isTrustedOfficial: Bool
    let region: TerrorAlert.Region
    let isEnabled: Bool
    let language: String?
    let updateFrequency: String?
    let contentFocus: String?
    let notes: String?
}

enum FeedKind: String, Codable {
    case rss
    case atom
    case json
    case html
    case xml
    case csv
}
