import Foundation

struct MonitoredDocumentFeedService: AlertFeedService {
    let source: AlertSource

    func fetchAlerts() async -> AlertFeedResult {
        guard let url = URL(string: source.endpoint) else {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: "Invalid URL")
            ])
        }

        let store = MonitoredDocumentStateStore()

        do {
            let response = try await fetchHeaders(from: url)
            let lastModified = response.value(forHTTPHeaderField: "Last-Modified")
            let etag = response.value(forHTTPHeaderField: "ETag")

            let newState = MonitoredDocumentState(etag: etag, lastModified: lastModified)
            let previousState = store.load(for: source.id)
            let hasChanged = previousState == nil || previousState != newState

            guard hasChanged else {
                return .empty
            }

            store.save(newState, for: source.id)

            let statusText = [
                lastModified,
                etag
            ]
            .compactMap { $0 }
            .joined(separator: " | ")

            let summary = [
                source.contentFocus,
                source.notes,
                statusText.isEmpty ? "Monitor signal changed." : "Monitor signal: \(statusText)"
            ]
            .compactMap { $0 }
            .joined(separator: " ")

            let alert = TerrorAlert(
                id: "document-\(source.id)",
                title: source.name,
                location: source.region == .uk ? "United Kingdom" : "Europe / International",
                region: source.region,
                severity: .moderate,
                verificationState: .verified,
                reportedAt: .now,
                summary: summary,
                sourceLabel: source.provider,
                sourceURL: source.endpoint,
                requiresImmediateAttention: false,
                coordinate: nil,
                sourceID: source.id
            )

            return AlertFeedResult(alerts: [alert], errors: [])
        } catch {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: error.localizedDescription)
            ])
        }
    }

    private func fetchHeaders(from url: URL) async throws -> HTTPURLResponse {
        var headRequest = URLRequest(url: url)
        headRequest.httpMethod = "HEAD"
        headRequest.timeoutInterval = 12

        do {
            let (_, response) = try await NetworkClient.shared.request(headRequest)
            return response
        } catch {
            if case NetworkClientError.httpStatus(405) = error {
                var getRequest = URLRequest(url: url)
                getRequest.httpMethod = "GET"
                getRequest.timeoutInterval = 12
                getRequest.setValue("bytes=0-0", forHTTPHeaderField: "Range")
                let (_, response) = try await NetworkClient.shared.request(getRequest)
                return response
            }

            throw error
        }
    }
}
