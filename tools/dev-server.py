"""Serwer deweloperski: jak python -m http.server, ale bez cache'owania.
Uruchom:  python tools/dev-server.py   ->  http://localhost:5173
Dzieki naglowkowi no-store przegladarka zawsze pobiera swieze pliki,
wiec po zmianie kodu wystarczy odswiezyc strone."""
import http.server
import os

PORT = 5173
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def send_header(self, keyword, value):
        if keyword.lower() == 'last-modified':
            return                      # bez tego przegladarka robi 304
        super().send_header(keyword, value)


if __name__ == '__main__':
    print(f'Slowka B2 -> http://localhost:{PORT}  (Ctrl+C konczy)')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler).serve_forever()
