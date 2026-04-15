import Foundation

enum FeedParsingSupport {
    static func mapAlert(
        title: String,
        summary: String,
        publishedAt: Date?,
        location: String?,
        sourceURL: String?,
        sourceIdentifier: String?,
        source: AlertSource
    ) -> TerrorAlert {
        let lowered = "\(title) \(summary)".lowercased()
        let severity = inferSeverity(from: lowered)
        let verificationState = inferVerificationState(from: lowered)
        let resolvedLocation = location ?? defaultLocation(for: source.region)

        return TerrorAlert(
            id: stableID(
                title: title,
                sourceID: source.id,
                publishedAt: publishedAt,
                sourceIdentifier: sourceIdentifier,
                sourceURL: sourceURL
            ),
            title: title,
            location: resolvedLocation,
            region: source.region,
            severity: severity,
            verificationState: verificationState,
            reportedAt: publishedAt ?? .now,
            summary: summary.isEmpty ? "Live feed item received from \(source.provider)." : summary,
            sourceLabel: source.name,
            sourceURL: sourceURL,
            requiresImmediateAttention: severity == .critical || severity == .high,
            coordinate: coordinate(for: resolvedLocation, fallbackRegion: source.region),
            sourceID: source.id
        )
    }

    static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }

        let isoFormatter = ISO8601DateFormatter()
        if let date = isoFormatter.date(from: value) {
            return date
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "E, d MMM yyyy HH:mm:ss Z"
        if let date = formatter.date(from: value) {
            return date
        }

        formatter.dateFormat = "d MMM yyyy HH:mm:ss Z"
        return formatter.date(from: value)
    }

    private static func stableID(
        title: String,
        sourceID: String,
        publishedAt: Date?,
        sourceIdentifier: String?,
        sourceURL: String?
    ) -> String {
        let trimmedIdentifier = sourceIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedURL = sourceURL?.trimmingCharacters(in: .whitespacesAndNewlines)
        let stamp = publishedAt?.formatted(date: .numeric, time: .standard) ?? "undated"

        let base: String
        if let identifier = trimmedIdentifier, !identifier.isEmpty {
            base = identifier
        } else if let url = trimmedURL, !url.isEmpty {
            base = url
        } else {
            base = "\(title)|\(stamp)"
        }

        return "\(sourceID)|\(base)"
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "|", with: "-")
    }

    private static func inferSeverity(from text: String) -> AlertSeverity {
        if text.contains("attack") || text.contains("explosion") || text.contains("fatal") {
            return .critical
        }
        if text.contains("arrest") || text.contains("device") || text.contains("weapon") {
            return .high
        }
        if text.contains("investigation") || text.contains("disruption") || text.contains("search") {
            return .elevated
        }
        return .moderate
    }

    private static func inferVerificationState(from text: String) -> TerrorAlert.VerificationState {
        if text.contains("confirmed") || text.contains("charged") || text.contains("official") {
            return .verified
        }
        if text.contains("reported") || text.contains("under investigation") || text.contains("developing") {
            return .developing
        }
        return .unconfirmed
    }

    private static func defaultLocation(for region: TerrorAlert.Region) -> String {
        switch region {
        case .all:
            return "Cross-region"
        case .uk:
            return "United Kingdom"
        case .europe:
            return "Europe"
        }
    }

    private static func coordinate(for location: String, fallbackRegion: TerrorAlert.Region) -> TerrorAlert.Coordinate? {
        let knownCoordinates: [String: TerrorAlert.Coordinate] = [
            "Westminster, London": .init(latitude: 51.4995, longitude: -0.1248),
            "London": .init(latitude: 51.5072, longitude: -0.1276),
            "Birmingham": .init(latitude: 52.4862, longitude: -1.8904),
            "Paris": .init(latitude: 48.8566, longitude: 2.3522),
            "Gare du Nord, Paris": .init(latitude: 48.8809, longitude: 2.3553),
            "Brussels": .init(latitude: 50.8503, longitude: 4.3517),
            "United Kingdom": .init(latitude: 54.7024, longitude: -3.2766),
            "Europe": .init(latitude: 50.1109, longitude: 8.6821)
        ]

        if let exact = knownCoordinates[location] {
            return exact
        }

        switch fallbackRegion {
        case .all:
            return .init(latitude: 51.5072, longitude: -0.1276)
        case .uk:
            return .init(latitude: 54.7024, longitude: -3.2766)
        case .europe:
            return .init(latitude: 50.1109, longitude: 8.6821)
        }
    }
}
