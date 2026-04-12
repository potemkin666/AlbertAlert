import Foundation

enum ThreatFeedConfigurationLoader {
    static func load() -> [AlertSource] {
        let resourceNames = [
            "ThreatFeeds",
            "ThreatFeeds.example",
            "ThreatFeeds.specialist.example",
            "ThreatFeeds.media-uk.example",
            "ThreatFeeds.media-europe-a.example",
            "ThreatFeeds.media-europe-b.example"
        ]

        var loadedSources: [AlertSource] = []

        for resourceName in resourceNames {
            if
                let url = Bundle.main.url(forResource: resourceName, withExtension: "json"),
                let data = try? Data(contentsOf: url),
                let sources = try? JSONDecoder().decode([AlertSource].self, from: data)
            {
                loadedSources.append(contentsOf: sources)
            }
        }

        return loadedSources
    }
}
