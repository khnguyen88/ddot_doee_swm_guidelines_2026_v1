"""Tests for pure-Python stormwater calculations."""
import math
import pytest

from workbook import calculations as calc


# SWRv

def test_swrv_volume_impervious_only():
    # 10,000 SF impervious at 1.7" = 10000 * 0.95 * 1.7 / 12 = 1345.833 CF
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=10000, comp=0, natural=0, bmp=0,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(10000 * 0.95 * 1.7 / 12, rel=1e-6)


def test_swrv_volume_mixed_landuse():
    # imp 5000 at 0.95, veh 2000 at 0.95, comp 3000 at 0.25 → rainfall 1.2"
    v = calc.swrv_volume(
        imp_veh=2000, imp_nonveh=5000, comp=3000, natural=1000, bmp=0,
        rainfall_in=1.2,
    )
    expected = (0.95 * (2000 + 5000) + 0.25 * 3000) * 1.2 / 12
    assert v == pytest.approx(expected, rel=1e-6)


def test_swrv_volume_bmp_contributes_zero():
    # Per spec: BMP Rv = 0.00 for SWRv (differs from the legacy script).
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=0, comp=0, natural=0, bmp=5000,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(0.0, abs=1e-9)


def test_swrv_volume_natural_contributes_zero():
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=0, comp=0, natural=10000, bmp=0,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(0.0, abs=1e-9)


# TR-55 runoff depth (SCS CN method)

def test_tr55_runoff_depth_impervious_17():
    # CN=98 at P=1.7": S = 1000/98 - 10 = 0.2041, Ia = 0.0408 → Q = 1.477"
    # Standard TR-55 formula: (P - Ia)^2 / (P - Ia + S)
    q = calc.tr55_runoff_depth(1.7, 98)
    assert q == pytest.approx(1.477, abs=0.005)


def test_tr55_runoff_depth_woods_hsg_b_17_is_near_zero():
    # Woods HSG B CN=55: S=8.18, Ia=1.636" < 1.7". P just barely exceeds Ia,
    # so Q is very small (~0.00049") but numerically nonzero. Treat as negligible.
    q = calc.tr55_runoff_depth(1.7, 55)
    assert q == pytest.approx(0.0, abs=0.002)


def test_tr55_runoff_depth_woods_hsg_c_17():
    # CN=70: S=4.286, Ia=0.857 → Q ≈ 0.138
    q = calc.tr55_runoff_depth(1.7, 70)
    assert q == pytest.approx(0.138, abs=0.005)


def test_tr55_runoff_depth_zero_when_p_below_ia():
    # Natural HSG A CN=25: S=30, Ia=6 >> 1.7
    assert calc.tr55_runoff_depth(1.7, 25) == 0.0


def test_tr55_runoff_volume_cf():
    # 10,000 SF impervious at 1.7" → 1.477" * 10000 / 12 ≈ 1231 CF
    v = calc.tr55_runoff_volume_cf(area_sf=10000, P_in=1.7, cn=98)
    assert v == pytest.approx(10000 * 1.477 / 12, rel=0.01)


# Horton infiltration

def test_horton_infil_loss_hsg_b():
    # HSG B: f_max=5, f_min=0.3, k=2.0 over 24 hr.
    # Closed-form integral: f_min*T + (f_max-f_min)/k * (1 - exp(-k*T)) = 9.55"
    loss = calc.horton_infil_loss(f_max=5.0, f_min=0.3, k=2.0, total_t_hr=24.0, dt_hr=0.5)
    analytic = 0.3 * 24 + (5.0 - 0.3) / 2.0 * (1 - math.exp(-2.0 * 24))
    assert loss == pytest.approx(analytic, rel=1e-6)


def test_horton_infil_loss_hsg_c():
    loss = calc.horton_infil_loss(f_max=3.0, f_min=0.1, k=3.5)
    analytic = 0.1 * 24 + (3.0 - 0.1) / 3.5 * (1 - math.exp(-3.5 * 24))
    assert loss == pytest.approx(analytic, rel=1e-6)


def test_horton_pre_computed_losses_table():
    # The PARAMS block pre-computes these; expose them as constants.
    assert calc.HORTON_INFIL_LOSS_B == pytest.approx(
        calc.horton_infil_loss(5.0, 0.3, 2.0), rel=1e-6)
    assert calc.HORTON_INFIL_LOSS_C == pytest.approx(
        calc.horton_infil_loss(3.0, 0.1, 3.5), rel=1e-6)


# EISA Direct Determination runoff depth per land use × HSG

def test_eisa_direct_impervious_17():
    assert calc.eisa_direct_runoff_depth("Impervious Vehicular", "C", 1.7) == pytest.approx(1.6, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("Impervious Non-Vehicular", "B", 1.7) == pytest.approx(1.6, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("BMP", "B", 1.7) == pytest.approx(1.6, abs=1e-9)


def test_eisa_direct_natural_hsg_a_is_zero():
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "A", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "A", 1.7) == 0.0


def test_eisa_direct_pervious_hsg_bc_depletes_to_zero_at_17():
    # Horton losses for 24 hr are large (>2"), so pervious HSG B/C return 0 at 1.7".
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "B", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "C", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "B", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "C", 1.7) == 0.0


def test_eisa_direct_hsg_d_conservative_default():
    # No Horton params for HSG D → conservative P - 0.2
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "D", 1.7) == pytest.approx(1.5, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "D", 1.7) == pytest.approx(1.5, abs=1e-9)


def test_tr55_total_volume_cf_multi_row():
    rows = [
        (10000, "Impervious Vehicular", "C"),
        (5000, "Natural (Woods)", "C"),
    ]
    total = calc.tr55_total_volume_cf(rows, P_in=1.7)
    # Imp: 10000 * Q(98) / 12; Natural C: 5000 * Q(70) / 12
    expected = (10000 * calc.tr55_runoff_depth(1.7, 98)
                + 5000 * calc.tr55_runoff_depth(1.7, 70)) / 12
    assert total == pytest.approx(expected, rel=1e-9)


def test_tr55_total_volume_cf_raises_on_unknown():
    with pytest.raises(ValueError, match="No CN entry"):
        calc.tr55_total_volume_cf([(1000, "Unknown Land Use", "A")], P_in=1.7)


def test_eisa_direct_total_volume_cf_multi_row():
    rows = [
        (10000, "Impervious Vehicular", "C"),
        (5000, "Natural (Woods)", "A"),
    ]
    total = calc.eisa_direct_total_volume_cf(rows, P_in=1.7)
    # Imp: 10000 * 1.6 / 12 = 1333.33; Natural A: 0
    expected = 10000 * 1.6 / 12
    assert total == pytest.approx(expected, rel=1e-6)
