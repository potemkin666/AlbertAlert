import Foundation

struct MockAlertFeedService: AlertFeedService {
    func fetchAlerts() async -> AlertFeedResult {
        try await Task.sleep(for: .milliseconds(300))
        return AlertFeedResult(
            alerts: TerrorAlert.mockData.sorted { $0.reportedAt > $1.reportedAt },
            errors: []
        )
    }
}
