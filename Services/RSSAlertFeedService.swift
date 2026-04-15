import Foundation

struct RSSAlertFeedService: AlertFeedService {
    let source: AlertSource

    func fetchAlerts() async -> AlertFeedResult {
        guard let url = URL(string: source.endpoint) else {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: "Invalid URL")
            ])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 12

        do {
            let (data, _) = try await NetworkClient.shared.request(request)
            let parser = FeedXMLParser(source: source)
            let alerts = try parser.parse(data: data)
            return AlertFeedResult(alerts: alerts, errors: [])
        } catch {
            return AlertFeedResult(alerts: [], errors: [
                AlertFeedError(source: source, message: error.localizedDescription)
            ])
        }
    }
}

final class FeedXMLParser: NSObject, XMLParserDelegate {
    private let source: AlertSource
    private var items: [TerrorAlert] = []
    private var currentElement = ""
    private var currentTitle = ""
    private var currentSummary = ""
    private var currentDate = ""
    private var currentLink = ""
    private var currentItemID = ""
    private var isInsideItem = false
    private var parseError: Error?

    init(source: AlertSource) {
        self.source = source
    }

    func parse(data: Data) throws -> [TerrorAlert] {
        items = []
        parseError = nil
        let parser = XMLParser(data: data)
        parser.delegate = self
        let success = parser.parse()
        if !success {
            throw parseError ?? NetworkClientError.invalidResponse
        }
        return items.sorted(by: { $0.reportedAt > $1.reportedAt })
    }

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String: String] = [:]) {
        currentElement = elementName.lowercased()
        if currentElement == "item" || currentElement == "entry" {
            isInsideItem = true
            currentTitle = ""
            currentSummary = ""
            currentDate = ""
            currentLink = ""
            currentItemID = ""
        }

        if isInsideItem, currentElement == "link" {
            if let href = attributeDict["href"] {
                currentLink = href
            }
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        guard isInsideItem else { return }

        switch currentElement {
        case "title":
            currentTitle += string
        case "description", "summary", "content":
            currentSummary += string
        case "pubdate", "updated", "published":
            currentDate += string
        case "link":
            currentLink += string
        case "guid", "id":
            currentItemID += string
        default:
            break
        }
    }

    func parser(_ parser: XMLParser, parseErrorOccurred parseError: Error) {
        self.parseError = parseError
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        let element = elementName.lowercased()

        guard element == "item" || element == "entry" else { return }
        isInsideItem = false

        let trimmedTitle = currentTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSummary = currentSummary.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedID = currentItemID.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedLink = currentLink.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedTitle.isEmpty else { return }

        let alert = FeedParsingSupport.mapAlert(
            title: trimmedTitle,
            summary: trimmedSummary,
            publishedAt: FeedParsingSupport.parseDate(currentDate.trimmingCharacters(in: .whitespacesAndNewlines)),
            location: nil,
            sourceURL: trimmedLink.isEmpty ? nil : trimmedLink,
            sourceIdentifier: trimmedID.isEmpty ? nil : trimmedID,
            source: source
        )
        items.append(alert)
    }
}
