import Foundation

struct JSONThreatFeedService: AlertFeedService {
    let source: AlertSource

    func fetchAlerts() async -> AlertFeedResult {
        guard let url = URL(string: source.endpoint) else {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: "Invalid URL")
            ])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 12

        do {
            let (data, _) = try await NetworkClient.shared.request(request)
            let items = try JSONDecoder().decode([RemoteThreatFeedItem].self, from: data)

            let alerts = items.map { item in
                FeedParsingSupport.mapAlert(
                    title: item.title,
                    summary: item.summary,
                    publishedAt: FeedParsingSupport.parseDate(item.publishedAt),
                    location: item.location,
                    sourceURL: item.sourceURL,
                    sourceIdentifier: item.itemID ?? item.guid,
                    source: source
                )
            }
            .sorted(by: { $0.reportedAt > $1.reportedAt })

            return AlertFeedResult(alerts: alerts, errors: [])
        } catch {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: error.localizedDescription)
            ])
        }
    }
}

struct RemoteThreatFeedItem: Codable {
    let itemID: String?
    let guid: String?
    let title: String
    let summary: String
    let location: String?
    let publishedAt: String?
    let sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case itemID = "id"
        case guid
        case title
        case summary
        case location
        case publishedAt = "published_at"
        case sourceURL = "source_url"
    }
}
