#!/usr/bin/env python3
"""Dependency-free development server and static site builder."""
import argparse
import json
import os
from pathlib import Path
import shutil
from promote import promote, encode
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

def load_research():
    records = []
    for path in sorted((CONTENT / 'research').glob('candidates.json')):
        batch = json.loads(path.read_text())
        if not isinstance(batch, list):
            raise ValueError(f'{path}: expected an array')
        records.extend(record for record in batch if record.get('publicationStatus') != 'Promoted')
    ids = [record['id'] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate research candidate IDs')
    return json.dumps(records, ensure_ascii=False).encode()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'site'), **kwargs)
    def do_GET(self):
        if self.path.split('?')[0] in ('/problems.json', '/research.json'):
            try:
                body = load_research() if self.path.split('?')[0] == '/research.json' else load_content()
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
    parser.add_argument('command', choices=['serve', 'build', 'check', 'promote'], nargs='?', default='serve')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--candidate', help='Research candidate ID to promote')
    parser.add_argument('--id', help='New stable problem ID, used in its filename and URL')
    parser.add_argument('--category', help='Public problem category')
    parser.add_argument('--summary', help='Reviewed public summary; also used as the initial description')
    parser.add_argument('--need', action='append', help='Public next step or need; repeat for multiple needs')
    parser.add_argument('--write', action='store_true', help='Write the promotion; otherwise preview only')
    args = parser.parse_args()
    if args.command == 'promote':
        if not all((args.candidate, args.id, args.category, args.summary, args.need)):
            parser.error('promote requires --candidate, --id, --category, --summary and --need')
        try:
            load_content()
            target, problem = promote(CONTENT, args.candidate, args.id, args.category,
                                      args.summary, args.need, write=args.write)
        except (ValueError, OSError, TypeError, KeyError) as error:
            parser.exit(1, f'Promotion failed: {error}\n')
        print(encode(problem))
        print(f'Created {target}. Candidate archived; nothing deployed.' if args.write
              else f'Preview only: would create {target}. Add --write to apply.')
        raise SystemExit(0)
    data = load_content()
    if args.command == 'build':
        target = ROOT / 'dist'
        shutil.copytree(ROOT / 'site', target, dirs_exist_ok=True)
        (target / 'problems.json').write_bytes(data)
        (target / 'research.json').write_bytes(load_research())
        print(f'Static site built at {target}')
    elif args.command == 'check':
        print(f'Validated {len(json.loads(data))} problem records and {len(json.loads(load_research()))} active research candidates.')
    else:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
        print(f'Unsolved is running at http://localhost:{args.port}', flush=True)
        server.serve_forever()
