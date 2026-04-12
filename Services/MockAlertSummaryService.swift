import Foundation

struct MockAlertSummaryService: AlertSummaryService {
    func generateSummary(for alert: TerrorAlert) async throws -> String {
        """
        This incident is being surfaced as a \(alert.severity.displayName.lowercased()) priority item in \(alert.location). The immediate value is to track whether the current reporting stays isolated, whether the verification status changes, and whether linked activity appears across the wider UK-Europe picture.
        """
    }
}
