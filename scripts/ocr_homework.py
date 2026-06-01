#!/usr/bin/env python3
"""Extract text from homework image (macOS Vision when available)."""
import json
import sys

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else ""
    if not path:
        print(json.dumps({"ok": False, "text": ""}))
        return
    try:
        import platform
        if platform.system() == "Darwin":
            import subprocess
            script = f'''
import Vision
import Foundation
url = NSURL.fileURLWithPath_("{path}")
request = VNRecognizeTextRequest.alloc().init()
handler = VNImageRequestHandler.alloc().initWithURL_options_(url, None)
err = None
handler.performRequests_error_([request], err)
results = request.results() or []
lines = [r.topCandidates_(1)[0].string() for r in results if r.topCandidates_(1)]
print("\\n".join(lines))
'''
            # Fallback: use macOS `textutil` won't work on images — use ctypes/vision via pyobjc if installed
            try:
                import Quartz  # noqa: F401
                from Cocoa import NSURL
                import Vision as V
                req = V.VNRecognizeTextRequest.alloc().init()
                handler = V.VNImageRequestHandler.alloc().initWithURL_options_(NSURL.fileURLWithPath_(path), None)
                success, err = handler.performRequests_error_([req], None)
                text_lines = []
                if success:
                    for obs in req.results() or []:
                        cand = obs.topCandidates_(1)
                        if cand:
                            text_lines.append(cand[0].string())
                text = "\n".join(text_lines)
                print(json.dumps({"ok": True, "text": text}))
                return
            except ImportError:
                pass
        print(json.dumps({"ok": False, "text": "", "error": "vision_unavailable"}))
    except Exception as ex:
        print(json.dumps({"ok": False, "text": "", "error": str(ex)}))

if __name__ == "__main__":
    main()
