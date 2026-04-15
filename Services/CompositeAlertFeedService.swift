import Foundation

struct CompositeAlertFeedService: AlertFeedService {
    let configuration: [AlertSource]
    let fallbackService: AlertFeedService

    func fetchAlerts() async -> AlertFeedResult {
        let enabledSources = configuration.filter(\.isEnabled)

        guard !enabledSources.isEmpty else {
            return await fallbackService.fetchAlerts()
        }

        var aggregatedAlerts: [TerrorAlert] = []
        var aggregatedErrors: [AlertFeedError] = []

        await withTaskGroup(of: AlertFeedResult.self) { group in
            for source in enabledSources {
                group.addTask {
                    switch source.kind {
                    case .rss, .atom:
                        return await RSSAlertFeedService(source: source).fetchAlerts()
                    case .json:
                        return await JSONThreatFeedService(source: source).fetchAlerts()
                    case .html, .xml, .csv:
                        return await MonitoredDocumentFeedService(source: source).fetchAlerts()
                    }
                }
            }

            for await result in group {
                aggregatedAlerts.append(contentsOf: result.alerts)
                aggregatedErrors.append(contentsOf: result.errors)
            }
        }

        let deduplicated = Dictionary(grouping: aggregatedAlerts, by: \.id)
            .compactMap { $0.value.sorted(by: { $0.reportedAt > $1.reportedAt }).first }
            .sorted(by: { $0.reportedAt > $1.reportedAt })

        if deduplicated.isEmpty {
            let fallback = await fallbackService.fetchAlerts()
            return AlertFeedResult(
                alerts: fallback.alerts,
                errors: aggregatedErrors + fallback.errors
            )
        }

        return AlertFeedResult(alerts: deduplicated, errors: aggregatedErrors)
    }
}
