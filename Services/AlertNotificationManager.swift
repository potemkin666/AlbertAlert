import Foundation
import UserNotifications

protocol AlertNotificationManaging {
    func requestAuthorizationIfNeeded() async
    func scheduleNotifications(for alerts: [TerrorAlert]) async
    func scheduleDailyBriefing() async
}

final class AlertNotificationManager: AlertNotificationManaging {
    private let center = UNUserNotificationCenter.current()
    private let seenKey = "albertalert.seenAlertIDs"
    private static let dailyBriefingIdentifier = "albertalert.daily-briefing"

    func requestAuthorizationIfNeeded() async {
        do {
            _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
        }
    }

    func scheduleNotifications(for alerts: [TerrorAlert]) async {
        let seenIDs = Set(UserDefaults.standard.stringArray(forKey: seenKey) ?? [])
        let newUrgentAlerts = alerts.filter {
            $0.requiresImmediateAttention &&
            $0.verificationState != .unconfirmed &&
            !seenIDs.contains($0.id)
        }

        for alert in newUrgentAlerts.prefix(3) {
            let content = UNMutableNotificationContent()
            content.title = "AlbertAlert Priority Incident"
            content.body = "\(alert.title) in \(alert.location)"
            content.sound = .default

            let request = UNNotificationRequest(
                identifier: alert.id,
                content: content,
                trigger: nil
            )

            do {
                try await center.add(request)
            } catch {
            }
        }

        let updatedSeen = Array(seenIDs.union(newUrgentAlerts.map(\.id)))
        UserDefaults.standard.set(updatedSeen, forKey: seenKey)
    }

    func scheduleDailyBriefing() async {
        center.removePendingNotificationRequests(
            withIdentifiers: [Self.dailyBriefingIdentifier]
        )

        let quotes = Self.loadBriefingQuotes()
        guard !quotes.isEmpty else { return }

        let dayOfYear = Calendar(identifier: .gregorian).ordinality(
            of: .day, in: .year, for: Date()
        ) ?? 1
        let quote = quotes[(dayOfYear - 1) % quotes.count]

        let content = UNMutableNotificationContent()
        content.title = "Albert says\u{2026}"
        content.body = quote
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.timeZone = TimeZone(identifier: "GMT")
        dateComponents.hour = 7
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: Self.dailyBriefingIdentifier,
            content: content,
            trigger: trigger
        )

        do {
            try await center.add(request)
        } catch {
        }
    }

    static func loadBriefingQuotes() -> [String] {
        guard
            let url = Bundle.main.url(
                forResource: "DailyBriefingQuotes",
                withExtension: "json"
            ),
            let data = try? Data(contentsOf: url),
            let quotes = try? JSONDecoder().decode([String].self, from: data)
        else {
            return []
        }
        return quotes
    }
}
