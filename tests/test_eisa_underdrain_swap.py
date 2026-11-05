"""EISA sheets must swap AT (Rv Reservoir) for V=Y BMP rows and AS (Rv Applied)
for V=N rows, and shift BMP range to rows 6-55 to match the new 81-col schema."""
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_eisa_direct_bmp_formula_is_sumproduct(wb):
    ws = wb["EISA_DIRECT"]
    found = False
    for row in range(1, ws.max_row + 1):
        label = ws.cell(row=row, column=1).value or ""
        if "Volume Infiltrated in BMPs" in label:
            f = ws.cell(row=row, column=2).value or ""
            assert "SUMPRODUCT" in f, f"got {f!r}"
            assert "$V$6:$V$55" in f
            assert "$AT$6:$AT$55" in f
            assert "$AS$6:$AS$55" in f
            found = True
            break
    assert found, "'Volume Infiltrated in BMPs' row not found on EISA_DIRECT"


def test_eisa_tr55_bmp_formula_is_sumproduct(wb):
    ws = wb["EISA_TR55"]
    found = False
    for row in range(1, ws.max_row + 1):
        label = ws.cell(row=row, column=1).value or ""
        if "BMPs" in label:
            f = ws.cell(row=row, column=2).value or ""
            if "SUMPRODUCT" in str(f):
                assert "$V$6:$V$55" in f
                assert "$AT$6:$AT$55" in f
                found = True
                break
    assert found, "SUMPRODUCT swap not found on EISA_TR55"
