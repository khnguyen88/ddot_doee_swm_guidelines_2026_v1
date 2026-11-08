"""Generate minimal .xlsx test fixtures for parse.test.mjs.

Run from repo root:
    python summary_calculator/tests/fixtures/generate_fixtures.py
"""
from pathlib import Path
import openpyxl

OUT_DIR = Path(__file__).resolve().parent


def _write_project_sheet(wb):
    ws = wb.create_sheet('PROJECT')
    for r, (k, v) in enumerate([
        ('Project Name', 'Test'),
        ('Project Number', 'T-001'),
        ('MS4 / CSS', 'MS4'),
        ('In AWDZ?', 'No'),
        ('DOEE Plan Review No.', 1),
        ('Total LOD Area (SF)', 10000),
        ('Retention Target (in)', 1.2),
        ('EISA 438 Depth (in)', 1.7),
        ('Trigger Type', 'MLD'),
        ('EISA Section 438 Applies?', 'Yes'),
    ], start=3):
        ws.cell(r, 1, k); ws.cell(r, 2, v)


def _write_bare_required_sheets(wb):
    """Minimal PROJECT, PARAMS, SDA_Existing, SDA_Proposed, CDA_Existing,
    CDA_Proposed, BMP so parseWorkbook does not throw."""
    _write_project_sheet(wb)
    for name in ['PARAMS', 'SDA_Existing', 'SDA_Proposed',
                 'CDA_Existing', 'CDA_Proposed', 'BMP']:
        wb.create_sheet(name)


def build_tc_path_fixture():
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    _write_bare_required_sheets(wb)
    ws = wb.create_sheet('TC_PATH')
    for c, h in enumerate([
        'ID', 'Name', 'Tc direct (min)',
        'Sheet n', 'Sheet L', 'Sheet P2', 'Sheet S', 'Tt_sheet (hr)',
        'Shallow surface', 'Shallow L', 'Shallow S', 'Tt_shallow (hr)',
        'Channel 1 L', 'Channel 1 V', 'Tt_ch1 (hr)',
        'Channel 2 L', 'Channel 2 V', 'Tt_ch2 (hr)',
        'Tc computed (hr)', 'Tc final (hr)', 'Tc final (min)',
    ], start=1):
        ws.cell(3, c, h)
    # Row 4: full path (sheet + shallow + channel)
    ws.cell(4, 1, 'SDA-1'); ws.cell(4, 2, 'Full path')
    ws.cell(4, 4, 0.15); ws.cell(4, 5, 100); ws.cell(4, 6, 3.1); ws.cell(4, 7, 0.01)
    ws.cell(4, 9, 'Paved'); ws.cell(4, 10, 500); ws.cell(4, 11, 0.02)
    ws.cell(4, 13, 1000); ws.cell(4, 14, 3)
    # Row 5: Tc direct override
    ws.cell(5, 1, 'SDA-2'); ws.cell(5, 2, 'Direct'); ws.cell(5, 3, 12.5)
    # Row 6: incomplete (just a shallow segment)
    ws.cell(6, 1, 'CDA-1'); ws.cell(6, 2, 'Short path')
    ws.cell(6, 9, 'Unpaved'); ws.cell(6, 10, 300); ws.cell(6, 11, 0.03)
    wb.save(OUT_DIR / 'tc-path-sample.xlsx')


if __name__ == '__main__':
    build_tc_path_fixture()
    print('Wrote fixtures to', OUT_DIR)
