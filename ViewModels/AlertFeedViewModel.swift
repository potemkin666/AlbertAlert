import Foundation

@MainActor
final class AlertFeedViewModel: ObservableObject {
    @Published var alerts: [TerrorAlert] = []
    @Published var selectedRegion: TerrorAlert.Region = .all
    @Published var lastUpdated: Date?
    @Published var isLoading = false
    @Published var watchlistIDs: Set<String>
    @Published var notes: [AnalystNote]
    @Published var selectedAlert: TerrorAlert?
    @Published var feedErrors: [AlertFeedError] = []
    @Published private(set) var summaryStates: [String: AlertSummaryState] = [:]

    let watchlists: [WatchlistItem]

    private let service: AlertFeedService
    private let notificationManager: AlertNotificationManaging
    private let summaryService: AlertSummaryService
    private let store = LocalAnalystStore()

    init(
        service: AlertFeedService,
        notificationManager: AlertNotificationManaging,
        summaryService: AlertSummaryService
    ) {
        self.service = service
        self.notificationManager = notificationManager
        self.summaryService = summaryService
        self.watchlistIDs = store.loadWatchlistIDs()
        self.notes = store.loadNotes().sorted(by: { $0.createdAt > $1.createdAt })
        self.watchlists = [
            WatchlistItem(
                id: UUID(),
                title: "Transport Hubs",
                focusArea: "Rail, aviation, and major commuter nodes",
                region: .uk,
                keywords: ["station", "airport", "transport", "terminal"],
                isActive: true
            ),
            WatchlistItem(
                id: UUID(),
                title: "Crowded Places",
                focusArea: "Event venues and symbolic sites",
                region: .europe,
                keywords: ["stadium", "festival", "tourist", "government"],
                isActive: true
            ),
            WatchlistItem(
                id: UUID(),
                title: "Cross-Border Signals",
                focusArea: "Travel-linked referrals and coordinated activity",
                region: .europe,
                keywords: ["border", "travel", "liaison", "passport"],
                isActive: true
            )
        ]
    }

    var filteredAlerts: [TerrorAlert] {
        switch selectedRegion {
        case .all:
            return alerts
        case .uk, .europe:
            return alerts.filter { $0.region == selectedRegion }
        }
    }

    var priorityAlert: TerrorAlert? {
        filteredAlerts
            .sorted {
                severityWeight(for: $0.severity) > severityWeight(for: $1.severity)
            }
            .first(where: \.requiresImmediateAttention)
        ?? filteredAlerts.first
    }

    var watchedAlerts: [TerrorAlert] {
        alerts.filter { watchlistIDs.contains($0.id) }
    }

    func loadAlerts() async {
        isLoading = true
        defer { isLoading = false }

        await notificationManager.requestAuthorizationIfNeeded()

        let result = await service.fetchAlerts()
        alerts = result.alerts
        feedErrors = result.errors
        lastUpdated = .now
        await notificationManager.scheduleNotifications(for: result.alerts)
    }

    func toggleWatchlist(for alert: TerrorAlert) {
        if watchlistIDs.contains(alert.id) {
            watchlistIDs.remove(alert.id)
        } else {
            watchlistIDs.insert(alert.id)
        }

        store.saveWatchlistIDs(watchlistIDs)
    }

    func isWatched(_ alert: TerrorAlert) -> Bool {
        watchlistIDs.contains(alert.id)
    }

    func addNote(title: String, body: String, relatedAlertID: String?) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBody = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty, !trimmedBody.isEmpty else { return }

        let note = AnalystNote(
            id: UUID(),
            title: trimmedTitle,
            body: trimmedBody,
            relatedAlertID: relatedAlertID,
            createdAt: .now,
            author: "Brian"
        )

        notes.insert(note, at: 0)
        store.saveNotes(notes)
    }

    func openDetail(for alert: TerrorAlert) async {
        selectedAlert = alert

        if case .loaded = summaryStates[alert.id] {
            return
        }

        summaryStates[alert.id] = .loading

        do {
            let summary = try await summaryService.generateSummary(for: alert)
            summaryStates[alert.id] = .loaded(summary)
        } catch {
            summaryStates[alert.id] = .failed("Summary unavailable. Check the summary gateway configuration.")
        }
    }

    func closeDetail() {
        selectedAlert = nil
    }

    func summaryState(for alert: TerrorAlert) -> AlertSummaryState {
        summaryStates[alert.id] ?? .idle
    }

    private func severityWeight(for severity: AlertSeverity) -> Int {
        switch severity {
        case .critical:
            return 4
        case .high:
            return 3
        case .elevated:
            return 2
        case .moderate:
            return 1
        }
    }
}
