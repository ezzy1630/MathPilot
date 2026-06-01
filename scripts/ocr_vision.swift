#!/usr/bin/env swift
import Foundation
import Vision

func emitJson(ok: Bool, text: String, error: String? = nil) {
    var payload: [String: Any] = ["ok": ok, "text": text]
    if let error, !error.isEmpty {
        payload["error"] = error
    }
    let data = try! JSONSerialization.data(withJSONObject: payload, options: [])
    if let json = String(data: data, encoding: .utf8) {
        print(json)
    } else {
        print(#"{"ok":false,"text":""}"#)
    }
}

guard CommandLine.arguments.count > 1 else {
    emitJson(ok: false, text: "")
    exit(0)
}

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)

guard FileManager.default.fileExists(atPath: path) else {
    emitJson(ok: false, text: "", error: "file_not_found")
    exit(0)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(url: url, options: [:])

do {
    try handler.perform([request])
    var lines: [String] = []
    if let results = request.results {
        for observation in results {
            if let candidate = observation.topCandidates(1).first {
                lines.append(candidate.string)
            }
        }
    }
    emitJson(ok: true, text: lines.joined(separator: "\n"))
} catch {
    emitJson(ok: false, text: "", error: error.localizedDescription)
}
