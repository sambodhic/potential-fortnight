import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import manage


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'research').mkdir()
        (self.root / 'problems').mkdir()
        self.patch = patch.object(manage, 'CONTENT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.record = dict(id='need-1', title='School water', country='Example',
                           location='Town', category='Water', status='Needs verification',
                           summary='Water needed', needs=['Check water supply'],
                           sources=[dict(url='https://example.org/report', label='Report',
                                         access='Private source access notes', token='secret')],
                           reviewNotes='Private notes', contact='Private contact',
                           potentialContactOrganization='Unconfirmed organization',
                           contactBasis='Private route', screening='Internal decision',
                           reportedCost={'meaning': 'Internal cost notes'},
                           futurePrivateField='Must not appear')

    def test_problem_export_uses_allowlist_including_nested_sources(self):
        (self.root / 'problems' / 'need.json').write_text(json.dumps(self.record))
        records = json.loads(manage.load_content())
        self.assertEqual(records[0]['title'], 'School water')
        self.assertEqual(records[0]['sources'], [dict(url='https://example.org/report', label='Report')])
        self.assertTrue(set(records[0]) <= set(manage.PROBLEM_FIELDS))
        for value in ('Private', 'secret', 'Unconfirmed', 'Must not appear'):
            self.assertNotIn(value, json.dumps(records))

    def test_research_export_excludes_private_fields_and_archived_records(self):
        active = {**self.record, 'publicationStatus': 'Research only',
                  'verificationStatus': 'Needs verification'}
        archived = {**active, 'id': 'old', 'publicationStatus': 'Promoted'}
        (self.root / 'research' / 'candidates.json').write_text(json.dumps([active, archived]))
        records = json.loads(manage.load_research())
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['verificationStatus'], 'Needs verification')
        self.assertTrue(set(records[0]) <= set(manage.RESEARCH_FIELDS) | {'sources'})
        for value in ('Private', 'secret', 'Unconfirmed', 'Must not appear', 'Internal'):
            self.assertNotIn(value, json.dumps(records))
