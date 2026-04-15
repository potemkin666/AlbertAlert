import Foundation

struct TerrorAlert: Identifiable, Codable, Hashable {
    enum Region: String, CaseIterable, Codable, Identifiable {
        case all = "All"
        case uk = "UK"
        case europe = "Europe"

        var id: String { rawValue }
    }

    enum VerificationState: String, Codable {
        case verified = "Verified"
        case developing = "Developing"
        case unconfirmed = "Unconfirmed"
    }

    struct Coordinate: Codable, Hashable {
        let latitude: Double
        let longitude: Double
    }

    let id: String
    let title: String
    let location: String
    let region: Region
    let severity: AlertSeverity
    let verificationState: VerificationState
    let reportedAt: Date
    let summary: String
    let sourceLabel: String
    let sourceURL: String?
    let requiresImmediateAttention: Bool
    let coordinate: Coordinate?
    let sourceID: String?
}

extension TerrorAlert {
    static let mockData: [TerrorAlert] = [
        TerrorAlert(
            id: "leeds-terrorism-charges",
            title: "Leeds Man Charged with Eleven Terrorism Offences",
            location: "Leeds",
            region: .uk,
            severity: .critical,
            verificationState: .verified,
            reportedAt: .now.addingTimeInterval(-4_800),
            summary: "Counter Terrorism Policing North East said a 33-year-old man from Leeds was charged with eleven terrorism offences after an intelligence-led investigation.",
            sourceLabel: "Counter Terrorism Policing",
            sourceURL: "https://www.counterterrorism.police.uk/leeds-man-charged-with-eleven-terrorism-offences/",
            requiresImmediateAttention: true,
            coordinate: .init(latitude: 53.8008, longitude: -1.5491),
            sourceID: "counter-terrorism-policing-case-news"
        ),
        TerrorAlert(
            id: "eurojust-self-igniting-parcels",
            title: "Joint Investigation Team Disrupts Group Using Self-Igniting Parcels",
            location: "Europe-wide",
            region: .europe,
            severity: .high,
            verificationState: .verified,
            reportedAt: .now.addingTimeInterval(-7_200),
            summary: "Eurojust said a joint investigation team was crucial in exposing several attacks across Europe involving self-igniting parcels and linked suspects in Lithuania and Poland.",
            sourceLabel: "Eurojust",
            sourceURL: "https://www.eurojust.europa.eu/news/joint-investigation-team-disrupts-group-using-self-igniting-parcels-terrorist-attacks",
            requiresImmediateAttention: true,
            coordinate: .init(latitude: 50.8503, longitude: 4.3517),
            sourceID: "eurojust-press-releases"
        ),
        TerrorAlert(
            id: "ctp-qualification-launch",
            title: "Qualification in Counter Terrorism Officially Launches",
            location: "United Kingdom",
            region: .uk,
            severity: .elevated,
            verificationState: .verified,
            reportedAt: .now.addingTimeInterval(-12_600),
            summary: "Counter Terrorism Policing announced the launch of an Ofqual-regulated qualification intended to strengthen counter-terrorism protective security and preparedness.",
            sourceLabel: "Counter Terrorism Policing",
            sourceURL: "https://www.counterterrorism.police.uk/?p=32668&post_type=post",
            requiresImmediateAttention: false,
            coordinate: .init(latitude: 52.3555, longitude: -1.1743),
            sourceID: "counter-terrorism-policing-protective-security"
        ),
        TerrorAlert(
            id: "home-office-terrorism-stats",
            title: "Operation of Police Powers under the Terrorism Act 2000",
            location: "United Kingdom",
            region: .uk,
            severity: .moderate,
            verificationState: .verified,
            reportedAt: .now.addingTimeInterval(-86_400),
            summary: "The Home Office statistics announcement covers arrests, outcomes, and stop-and-search powers under the Terrorism Act 2000, with the next release scheduled for June 2026.",
            sourceLabel: "Home Office",
            sourceURL: "https://www.gov.uk/government/statistics/announcements/operation-of-police-powers-under-the-terrorism-act-2000-quarterly-update-to-march-2026",
            requiresImmediateAttention: false,
            coordinate: .init(latitude: 51.5072, longitude: -0.1276),
            sourceID: "home-office-counter-terrorism-statistics"
        )
    ]
}
