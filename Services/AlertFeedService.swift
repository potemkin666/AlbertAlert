import Foundation

struct AlertFeedError: Identifiable, Codable, Hashable {
    let id: UUID
    let sourceID: String
    let sourceName: String
    let sourceKind: FeedKind?
    let message: String
    let occurredAt: Date

    init(source: AlertSource, message: String, occurredAt: Date = .now) {
        self.id = UUID()
        self.sourceID = source.id
        self.sourceName = source.name
        self.sourceKind = source.kind
        self.message = message
        self.occurredAt = occurredAt
    }
}

struct AlertFeedResult: Codable, Hashable {
    let alerts: [TerrorAlert]
    let errors: [AlertFeedError]

    static let empty = AlertFeedResult(alerts: [], errors: [])
}

protocol AlertFeedService {
    func fetchAlerts() async -> AlertFeedResult
}
