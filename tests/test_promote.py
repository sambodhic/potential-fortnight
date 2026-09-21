import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from promote import promote


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'problems').mkdir()
        (self.root / 'research' / 'batch').mkdir(parents=True)
        self.source = self.root / 'research' / 'batch' / 'candidates.json'
        self.candidate = dict(id='candidate-001',title='Water needed',country='Example',location='School',
                              reportedScope='18 pupils',sources=[dict(url='https://example.org/report')],
                              reviewNotes='Internal notes',potentialContactOrganization='Unconfirmed contact',
                              publicationStatus='Research only')
        self.source.write_text(json.dumps([self.candidate]))
    def run_promotion(self, **kwargs):
        return promote(self.root, 'candidate-001', 'school-water', 'Water', 'Reported water shortage.', ['Local assessment'], **kwargs)
    def test_preview_has_no_side_effects(self):
        original = self.source.read_bytes()
        target, data = self.run_promotion()
        self.assertFalse(target.exists())
        self.assertEqual(original, self.source.read_bytes())
        self.assertIsNone(data['contact'])
        self.assertIsNone(data['lastVerified'])
        self.assertNotIn('reviewNotes', data)
        self.assertEqual(data['status'], 'Needs verification')
    def test_write_preserves_research_and_blocks_repeat(self):
        target, data = self.run_promotion(write=True)
        self.assertEqual(json.loads(target.read_text()), data)
        saved = json.loads(self.source.read_text())[0]
        self.assertEqual(saved['publicationStatus'], 'Promoted')
        self.assertEqual(saved['reviewNotes'], 'Internal notes')
        with self.assertRaises(ValueError): self.run_promotion(write=True)
    def test_collision_in_different_filename(self):
        (self.root/'problems'/'other.json').write_text('{"id":"school-water"}')
        with self.assertRaises(ValueError): self.run_promotion(write=True)
    def test_bad_source_rejected_without_writes(self):
        self.candidate['sources'][0]['url']='javascript:alert(1)'
        self.source.write_text(json.dumps([self.candidate]))
        with self.assertRaises(ValueError): self.run_promotion(write=True)
        self.assertEqual(list((self.root/'problems').iterdir()), [])
    def test_archive_failure_rolls_back_problem(self):
        original = self.source.read_bytes()
        with patch.object(Path, 'replace', side_effect=OSError('disk error')):
            with self.assertRaises(OSError): self.run_promotion(write=True)
        self.assertEqual(list((self.root/'problems').iterdir()), [])
        self.assertEqual(original, self.source.read_bytes())
    def test_unsafe_id_rejected(self):
        with self.assertRaises(ValueError):
            promote(self.root,'candidate-001','../escape','Water','Summary',['Assessment'],write=True)

if __name__ == '__main__':
    unittest.main()
