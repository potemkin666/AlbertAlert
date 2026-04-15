import Foundation

struct AIServiceConfiguration: Codable {
    let summaryEndpoint: String
}

enum AIServiceConfigurationLoader {
    static func load() -> AIServiceConfiguration? {
        let resourceNames = ["AIServiceConfig", "AIServiceConfig.example"]

        for resourceName in resourceNames {
            guard
                let url = Bundle.main.url(forResource: resourceName, withExtension: "json"),
                let data = try? Data(contentsOf: url),
                let configuration = try? JSONDecoder().decode(AIServiceConfiguration.self, from: data)
            else {
                continue
            }

            return configuration
        }

        return nil
    }
}
