import SwiftUI

struct AnalystNotesView: View {
    @EnvironmentObject private var viewModel: AlertFeedViewModel
    @State private var noteTitle = ""
    @State private var noteBody = ""

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.06, blue: 0.10),
                        Color(red: 0.12, green: 0.14, blue: 0.17)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("Analyst Notes")
                            .font(.system(size: 32, weight: .heavy, design: .rounded))
                            .foregroundStyle(.white)

                        VStack(alignment: .leading, spacing: 12) {
                            TextField("Note title", text: $noteTitle)
                                .textFieldStyle(.plain)
                                .padding()
                                .background(Color.white.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .foregroundStyle(.white)

                            TextEditor(text: $noteBody)
                                .frame(minHeight: 140)
                                .padding(10)
                                .scrollContentBackground(.hidden)
                                .background(Color.white.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .foregroundStyle(.white)

                            Button("Save Note") {
                                viewModel.addNote(
                                    title: noteTitle,
                                    body: noteBody,
                                    relatedAlertID: viewModel.priorityAlert?.id
                                )
                                noteTitle = ""
                                noteBody = ""
                            }
                            .font(.headline)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 12)
                            .background(Color(red: 0.86, green: 0.63, blue: 0.22))
                            .foregroundStyle(.black)
                            .clipShape(Capsule())
                        }

                        ForEach(viewModel.notes) { note in
                            VStack(alignment: .leading, spacing: 10) {
                                Text(note.title)
                                    .font(.headline)
                                    .foregroundStyle(.white)

                                Text(note.body)
                                    .font(.body)
                                    .foregroundStyle(Color.white.opacity(0.82))

                                Text("\(note.author) | \(note.createdAt.formatted(date: .abbreviated, time: .shortened))")
                                    .font(.caption)
                                    .foregroundStyle(Color.white.opacity(0.55))
                            }
                            .padding(18)
                            .background(Color.white.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        }
                    }
                    .padding(18)
                }
            }
        }
    }
}
