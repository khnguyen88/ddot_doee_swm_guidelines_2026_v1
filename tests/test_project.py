import pytest
import openpyxl

from workbook.builders import project


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    project.build_project_sheet(w)
    return w


def test_project_sheet_exists(wb):
    assert "PROJECT" in wb.sheetnames


def test_project_field_labels(wb):
    ws = wb["PROJECT"]
    expected_labels = [
        (3,  "Project Name"),
        (4,  "Project Number"),
        (5,  "MS4 / CSS"),
        (6,  "In AWDZ?"),
        (7,  "DOEE Plan Review No."),
        (8,  "Total LOD Area (SF)"),
        (9,  "Retention Target (in)"),
        (10, "EISA 438 Depth (in)"),
        (11, "Trigger Type"),
        (12, "EISA Section 438 Applies?"),
    ]
    for r, label in expected_labels:
        assert ws.cell(row=r, column=1).value == label, f"Row {r} label mismatch"


def test_retention_default(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=9, column=2).value == 1.2


def test_eisa_default(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=10, column=2).value == 1.7


def test_named_ranges_defined(wb):
    expected = {
        "PROJECT_Name":                "'PROJECT'!$B$3",
        "PROJECT_Number":              "'PROJECT'!$B$4",
        "PROJECT_MS4":                 "'PROJECT'!$B$5",
        "PROJECT_AWDZ":                "'PROJECT'!$B$6",
        "PROJECT_DOEEReview":          "'PROJECT'!$B$7",
        "PROJECT_TotalLOD":            "'PROJECT'!$B$8",
        "PROJECT_Rainfall_Retention":  "'PROJECT'!$B$9",
        "PROJECT_Rainfall_EISA":       "'PROJECT'!$B$10",
        "PROJECT_Trigger":             "'PROJECT'!$B$11",
        "PROJECT_EISA":                "'PROJECT'!$B$12",
    }
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    for name, addr in expected.items():
        assert name in names, f"Missing named range: {name}"
        assert names[name] == addr


def test_rainfall_cell_comments(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=9, column=2).comment is not None, "Retention cell needs guidance comment"
    assert "MLD" in ws.cell(row=9, column=2).comment.text
    assert ws.cell(row=10, column=2).comment is not None, "EISA cell needs guidance comment"
    assert "95th percentile" in ws.cell(row=10, column=2).comment.text
