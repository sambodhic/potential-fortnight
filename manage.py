#!/usr/bin/env python3
"""Dependency-free development server and static site builder."""
import argparse
import json
import os
from pathlib import Path
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
CONTENT = Path(os.environ.get('CONTENT_DIR', ROOT.parent / 'laughing-fiesta')).resolve()

def load_content():
    records = []
    ids = set()
    for path in sorted((CONTENT / 'problems').glob('*.json')):
        record = json.loads(path.read_text())
        for key in ('id', 'title', 'summary', 'country', 'location', 'category', 'status', 'needs', 'sources'):
            if key not in record:
                raise ValueError(f'{path.name}: missing {key}')
        for key in ('id', 'title', 'summary', 'country', 'location', 'category', 'status'):
            if not isinstance(record[key], str) or not record[key].strip():
                raise ValueError(f'{path.name}: {key} must be a nonempty string')
        if record['id'] in ids:
            raise ValueError(f'{path.name}: duplicate id')
        if not isinstance(record['needs'], list) or not all(isinstance(x, str) for x in record['needs']):
            raise ValueError(f'{path.name}: needs must be a list of strings')
        if not isinstance(record['sources'], list) or not all(isinstance(s, dict) and isinstance(s.get('label'), str) and isinstance(s.get('url'), str) and s['url'].startswith(('https://', 'http://')) for s in record['sources']):
            raise ValueError(f'{path.name}: sources need a label and HTTP(S) url')
        ids.add(record['id'])
        records.append(record)
    if not (CONTENT / 'problems').is_dir():
        raise ValueError(f'Content folder not found: {CONTENT / "problems"}')
    return json.dumps(records, ensure_ascii=False).encode()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'site'), **kwargs)
    def do_GET(self):
        if self.path.split('?')[0] == '/problems.json':
            try:
                body = load_content()
            except (ValueError, OSError) as error:
                self.send_error(500, str(error))
                return
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['serve', 'build', 'check'], nargs='?', default='serve')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    data = load_content()
    if args.command == 'build':
        target = ROOT / 'dist'
        shutil.copytree(ROOT / 'site', target, dirs_exist_ok=True)
        (target / 'problems.json').write_bytes(data)
        print(f'Static site built at {target}')
    elif args.command == 'check':
        print(f'Validated {len(json.loads(data))} problem records.')
    else:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
        print(f'Unsolved is running at http://localhost:{args.port}', flush=True)
        server.serve_forever()
