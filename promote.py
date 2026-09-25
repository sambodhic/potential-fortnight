"""Convert reviewed research into public problem records without publishing them."""
import json
import re
from pathlib import Path
from urllib.parse import urlparse


def encode(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def promote(content, candidate_id, problem_id, category, summary, needs, write=False):
    content = Path(content)
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', problem_id):
        raise ValueError('Problem ID must use lowercase letters, numbers and single hyphens.')
    if not category.strip() or not summary.strip() or not needs or any(not n.strip() for n in needs):
        raise ValueError('Provide a category, public summary, and at least one nonempty --need.')
    matches = []
    for path in sorted((content / 'research').glob('candidates.json')):
        batch = json.loads(path.read_text())
        for index, candidate in enumerate(batch):
            if candidate.get('id') == candidate_id:
                matches.append((path, batch, index, candidate))
    if len(matches) != 1:
        raise ValueError(f'Expected one candidate with ID {candidate_id}; found {len(matches)}.')
    source_path, batch, index, candidate = matches[0]
    if candidate.get('publicationStatus') == 'Promoted':
        raise ValueError(f'Candidate already promoted to {candidate.get("promotedProblemId")}.')
    target = content / 'problems' / f'{problem_id}.json'
    if target.exists():
        raise ValueError(f'Refusing to overwrite {target}.')
    for path in target.parent.glob('*.json'):
        if json.loads(path.read_text()).get('id') == problem_id:
            raise ValueError(f'Problem ID already exists in {path.name}.')
    for key in ('title', 'country', 'location', 'reportedScope'):
        if not isinstance(candidate.get(key), str) or not candidate[key].strip():
            raise ValueError(f'Candidate is missing {key}.')
    sources = []
    for source in candidate.get('sources', []):
        url = source.get('url', '')
        parsed = urlparse(url)
        if parsed.scheme not in ('https', 'http') or not parsed.hostname:
            raise ValueError('Candidate has an invalid source URL.')
        label = source.get('label') or parsed.hostname
        if source.get('publishedOrUpdated'):
            label += f' — {source["publishedOrUpdated"]}'
        sources.append({'label': label, 'url': url})
    if not sources:
        raise ValueError('At least one source is required for promotion.')
    problem = dict(id=problem_id, title=candidate['title'], summary=summary.strip(),
                   description=summary.strip(), country=candidate['country'],
                   location=candidate['location'], category=category.strip(),
                   status='Needs verification', needs=[n.strip() for n in needs],
                   affected=candidate['reportedScope'], contact=None, sources=sources,
                   lastVerified=None, isExample=False)
    if write:
        # Preserve research/provenance, but remove this entry from the research page.
        original = source_path.read_bytes()
        batch[index] = {**candidate, 'publicationStatus': 'Promoted', 'promotedProblemId': problem_id}
        temporary = source_path.with_suffix('.json.tmp')
        temporary_created = False
        try:
            with temporary.open('x', encoding='utf-8') as stream:
                temporary_created = True
                stream.write(encode(batch))
            try:
                with target.open('x', encoding='utf-8') as stream:
                    stream.write(encode(problem))
            except FileExistsError:
                raise ValueError(f'Refusing to overwrite {target}.')
            except OSError:
                target.unlink(missing_ok=True)
                raise
            try:
                if source_path.read_bytes() != original:
                    raise ValueError('Research changed during promotion; retry after reviewing it.')
                temporary.replace(source_path)
            except (OSError, ValueError):
                target.unlink()
                raise
        finally:
            if temporary_created:
                temporary.unlink(missing_ok=True)
    return target, problem
