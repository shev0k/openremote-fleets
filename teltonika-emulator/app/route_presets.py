from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

RoutePoint = tuple[float, float]
RoutePresetPhaseKind = Literal["stop", "idle", "break", "engine_off", "offline", "signal"]


@dataclass(frozen=True)
class RoutePresetPhase:
    kind: RoutePresetPhaseKind
    start_progress: float
    duration_seconds: float


@dataclass(frozen=True)
class RoutePresetProfile:
    name: str
    display_name: str
    base_speed_kph: int
    hint: str
    phases: tuple[RoutePresetPhase, ...]
    emits_trip_attribute: bool = True
    history_time_scale: float = 1.0
    history_backfill_minutes: int = 180


ATLAS_PROFILE_PHASES = (
    RoutePresetPhase(kind="stop", start_progress=0.18, duration_seconds=55),
    RoutePresetPhase(kind="idle", start_progress=0.46, duration_seconds=190),
    RoutePresetPhase(kind="engine_off", start_progress=0.76, duration_seconds=22),
)

HARBOR_PROFILE_PHASES = (
    RoutePresetPhase(kind="break", start_progress=0.42, duration_seconds=680),
    RoutePresetPhase(kind="stop", start_progress=0.72, duration_seconds=70),
)

DELTA_PROFILE_PHASES = (
    RoutePresetPhase(kind="signal", start_progress=0.30, duration_seconds=160),
    RoutePresetPhase(kind="stop", start_progress=0.68, duration_seconds=60),
)

NIMBUS_PROFILE_PHASES = (
    RoutePresetPhase(kind="offline", start_progress=0.24, duration_seconds=720),
    RoutePresetPhase(kind="engine_off", start_progress=0.82, duration_seconds=35),
)

COURIER_PROFILE_PHASES = (
    RoutePresetPhase(kind="idle", start_progress=0.60, duration_seconds=180),
    RoutePresetPhase(kind="break", start_progress=0.74, duration_seconds=640),
    RoutePresetPhase(kind="offline", start_progress=0.92, duration_seconds=705),
)


def decode_polyline6(encoded: str) -> list[RoutePoint]:
    coordinates: list[RoutePoint] = []
    index = 0
    latitude = 0
    longitude = 0

    while index < len(encoded):
        result = 0
        shift = 0
        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        latitude += ~(result >> 1) if result & 1 else result >> 1

        result = 0
        shift = 0
        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1F) << shift
            shift += 5
            if byte < 0x20:
                break
        longitude += ~(result >> 1) if result & 1 else result >> 1

        coordinates.append((latitude / 1_000_000, longitude / 1_000_000))

    return coordinates


_ROUTE_GEOMETRIES: dict[str, tuple[str, ...]] = {
    "atlas_eindhoven": (
        "k~tbaBkwwjI|DtMpAfEnBvFrA`E~CoDbDsEyA{E}AkEqIuUaJqT{c@ouAaYy|@_Zc~@gEaQ{B{HsA}DeCaHeCeHmDoI}Pch@wQal@m@uBc@cBqAcFgAuGiAiHUsAiBqLaDmQ_EmSyBwLa@uB[}AmAkG}@wE}@wE]uAmCgLcLyf@c\\ycBoAsKeBkPgIcx@KyAIsAeBmMf@{ECcFo@wEwAsD}B}MSiA]{B}@wGmHm_Am@_HOiB}AoRuD{`@wCeYeCgTQ}Au@iIaA{Ig@sFwGgj@Y_CIu@m@}E]qEMsBSeD?kAVqEt@aH`f@esBrGcYPu@zDkQhRwx@VcA`BmHoFsEgBpHU~@kRjx@gE|POp@{BtJuBrJwR|y@kCyAk@e@yGsF",
        "q|~baBk}}kIxGrFj@d@jCxAs@|DiBvSaGjWmEfSu@lGIzAA`A@zDBjBNlE`@fFFv@bA`NnGzh@LfAfAvI~@fIvB`RjAxLfCnWbFvl@NjBp@hIbBxUjD~e@EzHGxAIrAe@~Io@XkGxBw@RQDiE~@yIHmHBkMJqLBiEqA_FqC_FgDaI_H_CeCoBcCuBwCeBuC_F_H}AaEkA_EsFiTuO{o@{y@uoDmYwmA}Nwn@qQwx@cO}p@}@cEiFgVwBsL_CaO_AoGuB}NYqBQkAw@uFgBeJsA}F]kBiEuTwByKkIq^qYuzAkDyQaHc\\[yAa@qB{A{HqAoGeAcGyGk_@uEuZo@gEiAuHiCsQ{@gGq@qGu@uFmNqhAsAsLw@uLu@c`Ai@{Tc@cNwB}c@yHmrAmD_x@GcAQsCg@eJa@}Gc@oGUqC[_EaH_y@o@gJg@_J]cJIsECwDGyG@mGFgHLkHzAa`@nAaKZeFLcFJgRBkPGaYFkP~Bmf@NkNB{B@oACgGAm@nEYlS_BxR}ArHAx_@~AlDXlD\\E~DEpEY|PiBtIm@fEmArUmA|U",
        "_wicaBkhfmIeAhSWhQeMsAcOw@cBSgo@gO{BMm@wGOmG?uJ{@uCm@mB~Bmf@NkNB{B@oACgGAm@CaKaSfBqCVgAH_Ff@mQdBiNdA}Er@aWzGyCbB__BpO{PgBgFSqe@nEyBR{Fh@MqMKiKi@gj@cAueAwA{_Bi@kn@iAuoAEkFUaWaAqhAE}DUc]EyG\\iL_Acx@MmLKaJmB{o@EkA?cB@wD@{Ab@c@`@m@Xw@R}@JaADeACeAIcAS}@Yy@_@o@c@c@CcF?y@@iBPyZh@{u@@_B]kN?qLeAskFCsT_@wl@CiBDmGz@y@n@sA\\eBHoBIoB]eBm@uA{@y@uA]uAR_B~Aw@xCKzBLzBd@lBx@rAfAp@PfG@tB`@n]}ABAhI@hEyd@gCiA|v@I~E",
    ),
    "harbor_eindhoven": (
        "gjidaBkkmoIVsInAwKfBuSjL_mErA}y@r@im@f@cg@N}nAW{v@e@kh@wAuzAKuGd@gGnAgQ|AaUHuDKiKdFGjHI`JIxQaBjCiC`@{DbBad@j@qKja@pKjBnAhAnCvEjNfCrGhPnd@b[gl@bIoJlq@ic@fAs@vf@aZdZyEzNoCxJmDnJoGzJiJbIyMnUks@rC_LjIeW|DsPnBoJ~TyhA`@mBtYd^dC`DpAbBl@aBrBsGl@aG~@uCtC_DnAs@zBmCrKkMr@wB??",
        "ymycaB}|opI??s@vBsKjM{BlCoAr@uC~C_AtCm@`GsBrGm@`B`I`K`NnO`QnMtO~InAp@dB`A`O|HlRnKh{@td@~RlKdAt@xCdBnZzP`GdEfD~ClDzDrErHrFpNfC`JjClJjD`LhC~EjFtH|FxEtDvAnEbCvBJZEv@K|Ck@hAUnIuB]}D}@{LyHgfAkEs{@qHy|AsLwtCqBqg@m@wNwD{|@gEu_AiD{u@gDgt@qDsu@{Dkt@aEyt@mHwiA}@mNcDwd@iBqUsAyQyFgt@wGcy@uFoo@iHes@eNirAqKm}@e[cdCeGwb@}DaXsHuh@_Iuh@cOsaAqSirA{Gq~@kFoi@cEoh@gD_i@wBw`@mA{SmAyU}@}PyAeXo@gL{@}OGaAfLu@dNEbHPtH|@xIjBxKhBvN~LhObQlYfj@buAvwCxh@fjAn\\rr@za@z~@jOfYbCbG~GhLbFhGlOzNdAnBjEtCrIfElChA|BdAn@`@Dr@ZzAj@zAn@lA`@f@Z^b@\\n@Vr@Fr@@^G~@Up@c@l@o@fBqBd@Yj@WtBOrJCxI?r]uCl\\{ChUwBbCU|Eg@`AKzD_@vt@yFfXo@jBb@zEW`Ig@bEa@nAEt@?^`Ab@d@x@t@p@Zz@@jMgAxD[rAYt@c@f@]bBoCbA_ClBoBbAUhRcC`MsCrWgIrOcI",
    ),
    "delta_eindhoven": (
        "yg`aaBgzlkIsJnCaIzBeD|@rD|c@{XxHqKzCi]~ImA`B]fB{@|TuWmCcBSmCy@sAqDsHmi@oA{G_DaR}CcN{@gE~BgEdEsJxCgKV_B~@sFh@kGTeFCeGaAaKoAgSk@}KAgKKwBs@eLy@cMqAyPgCcOgMekBi@{Li@sJWiHg@{MLw\\BqGOuKi@uJwB}ZiFoz@ImL{@yUKmBEkAu@uViAmLqBgjAKc\\@ue@l@oJRmOFmG@uDJwROaKr@me@j@eaA\\sNEwJSwIeAqK}AoJ}K_}@yDeMw@aLoGsi@[oEo@eJa@sM@iKX{FXwE~@uJ`AyMyCuAqGgC_J}CyM{DoImAyG_@oHDkFLcHiCsjAkb@uuAwg@kI}CcFyDwGuBaCs@",
        "gxoaaB{iulIiDeAiKsAcIHoHd@uIzCqShJmBz@gJ|DsH|CiInDqHjBgNjDcOdCqGhAsIpAqDPwAAqAKkAQcAWwEwBaA[_ASs@MgHK_RiD_IaBsBOiJq@{XoA{Mm@aI_AmEaB{BkAeDcC|B{KbKuf@lFiXd@cCjAaGx@{Dn@yC~AqIpZuqBx@qFzG_i@bHum@~@{I|Ds_@vGeu@rGu{@fFw}@bGwuAVaIxHkrBh@wNzSktF~Ciq@n@}PhBqf@\\iI?MNwD^eKvDn@^FlOIxVdFnDr@`NbCnTzExf@zKbc@hJpK|BpGrAblAbVvDt@bb@bIhA_J\\aDtE}[|Hkc@xDyPbIqYxHaV~FeLdFcEfJsGi@kFJgFhJql@r@gFhCyQnDq\\dDwb@zAyFb@gELoELsCtB{l@|Aij@g@cQ\\cK~@iY",
    ),
    "nimbus_eindhoven": (
        "qwkcaBukjhImTiWcM}KkJ_H_iAyi@m^eQqVsLuFiChYiuAz@{Cr@kBl@gAn@m@|A{@`Cu@zFPlG?rF[fGm@nEq@vEsA`GoBbGkD~NgJ|T}R`a@}^pFuMt@eBp@wBp@gCt@_Ed@kD^cEVaFHuD?qC?kCG}BKeBYoCY{Bm@aFo@_FgAgFy@yCy@gCsA}CsAeCwAiBmAoAuBsAcB{@sAi@yAY}AOuA@gCHwCd@qF~BoMxIyRnOwF`E_FtCuZxOaJzD_JnEeAf@aAb@gDlAuHtBmFj@aLbBsSfByGb@}Jd@aEH_EFyFH_GGoBSmBYcA[{@_@wAo@qCwAyBwAcD{CiBqBgAwAcAwAq@sAa@{@k@sAq@oBgG{RsG{SwFqRuQ{l@kh@idBaY_`A_EuN_BiFoFkSyO}i@gKab@mXm~@Oq@gGqS_IuRyHuSsCiImCqIic@myAcNwa@qGqQsF{NsNa[qPm\\sAqCuBeEgb@iy@cHgPkF_MoH{SqFsQwZcnAsCcLtC{KfH_Zv@{ErDwNjcAe_E|~@wqDzt@avCbBzBbYjYrCfBbDz@fC?`CQvEmA",
        "wfzcaBonfjIwElAaCPgC?cD{@sCgBcYkYcB{B{t@`vC}~@vqDkcAd_EsDvNwElDcEhOm@tBsCnKmB}HkFiTiTk{@uW}dA]sAgEuP{DoMcBcFyHqUk[uy@iE{K}D_LqD{L_EiMgCuJmCkL}BmKsAsH{AeIsCcQaCeQ_BcOmAiNqJabByCqg@sA{OmC{UsAsJqAwIuB}KiBoJ]{AgBmHsBuH_IuVeDwJwAkDkAoCcK_UoKyRgWof@sVge@uOm[}o@umA}BiE{LqVwFoKu\\os@oAkCgGwJsEuHcQ}[}^eu@mEqKoEoLoHeSuDmKmBqFqBeGyW{bAq@eCyB}I}D{OwBgJmHcYaGgToQon@aHwVg@mBgCkJaCyIyBgIiByGsK}_@yl@{xBmIgZoKo_@q@oCwBaItC{A~DmB|KwFbWqOl@o@`FeEtE_En@e@lJgH`NoKlEoDxEsDvT}PpEyDpFaE|k@se@xEsDvEaEp^_ZvCsCbC}Df@wAf@{AVs@l@cFDwOm@yEgAeGkM{k@mBuJqB_JoJsb@{@iGOaJd@wFdAaG`EsIrMcK|E{DbHaGpBiBbDqGle@a[~NyIrB_AdCsAxCgBdFkBfFcExEeErCoExz@um@jMiK~NeLvJuHxCi@nB_BhA}@vBeBtBqDh\\uVrLaJ~B]|BiBpFcFpBfIbFvWdD|SrFwEvAaBv\\k`@",
    ),
    "courier_eindhoven": (
        "upoaaBwf|qIYZgTr]gY~k@_I~RomAu_@OGk@MMEeBc@kBfQ}@nKy@dGyDzY}B~JcAhHWzCo@|JWxKaDt^}C~Sk@bEq@|HeCdWw@tJq@~HcApO@pIMtGmBtT}Fbn@aD~UKr@L`JsAg@mAU_@G[GaLyA{Ga@yVKeE^{KxAeWhGoEtCeCfA_|AnUaIhDcc@dO}CFyIoGaClDq@dAqC~ByN|AkJxF}A`AsKtFw@dBmP|]{Uvh@_AtI}G|DuIhUiAhFiSje@gNn\\iBnEyBbGkExIs@dAyJzGq@h@{}@jbBeCdEom@vfAsJhP{EhIsPnXaGxIeIpJoIzJkF|GeClFeBtEuMnb@u[|fA_GbR{ErMiXpj@gKfStArClB`JtEdTba@_X",
        "}jkbaBqhupIca@~WuEeTmBaJuAsCcThXgkA~xAqqAnaBqg@jo@mHhFwGbFmLtGoChAiRvFqTtGyC|@iCv@aBh@oCx@~AzKd@rBxBrDjPd_AzNn}@lDrVhE`[HxFlAxSJdLxDrBjD]nHf@nBxAlGfL~CbGp@nAxFrKrDrDdBjEjEhNlB|HjBtIvAbKjBvNLnB|ArW^b^^xMo@xE@lA@tE?fCm@n@c@~@[hAQnAuAZiCn@kAZmDzBsBEoGaAsIgEiE{BkImEqMaH}@KaGo@}IzAmBZ}HpGeBtAoFnK{R`w@gI|[_GvVgId\\gAlE_BrIgBvLeB`TM~EO~Fe@nSQjJaB`_AkArq@IhSqBhBeAh@cLdFyH`FkEtE{GlIgFlKeElMwEnTeElRg@dCq@hDcA`GbEvDfHtMpDnObQlYfj@buAvwCxh@fjAn\\rr@za@z~@jOfYbCbG~GhLbFhGlOzNdAnBjEtCrIfElChA|BdAn@`@Dr@ZzAj@zAn@lA`@f@Z^b@\\n@Vr@Fr@@^G~@Up@c@l@o@fBqBd@Yj@WtBOrJCxI?r]uCl\\{ChUwBbCU|Eg@`AKzD_@vt@yFfXo@jBb@zEW`Ig@bEa@nAEt@?^`Ab@d@x@t@p@Zz@@jMgAxD[rAYt@c@f@]bBoCbA_ClBoBbAUhRcC`MsCrWgIrOcI?",
        "sn`caB_u~nI??wE{AcGSyMrEqh@lQ}BtAkAmFiAkFcGc_@kEi[sD}\\aGmd@eJgl@sCsQoBiJuJsd@eEcSaAiE}Kkg@YsAiE{Vi@mDs@gIIyDJiF^sDv@}GRwDBcESiC}I}u@{KebAsJs|@kEsi@}AwEu@qAc@e@Js@Au@Mq@KYOQSMUEUBUJONMTK^E`@Ab@Df@J`@N\\TRk@jDoGj`@oFzZcB|EeBdDY^sWzUiNvGyIvF}CpB]TgJnFwGxEm@b@gUfRgMlKaF~DcHbFez@hm@iDdCsHxFcFbE}p@bj@u_@nYyPhNwHbIuI`LeP`Y}IzQ{Rrh@qIdW_GdSoHfXkKtc@gI`b@oDxRgDfUeDpYgC|a@cBre@sA`n@CpBEhBm@~[WzYQb^Xpk@PjOzBruAP|E\\jRbBpn@lDhhAR~^@hCO`G_B~Aw@xCKzBLzBd@lBx@rAfAp@PfG@tB`@n]BjM~@biEFlq@BxDDtMrBc@ZAlDGl@?rA?pf@nD~ADdCL`ADnTf@rBBhJ`@xFPphA`E~EPr@BbCJpDL`L\\V@N@fSbA|AFWtNQnNVnP`@bHPdDhA`KnBhI|B~E~H~P`DfNfB~P`AvGDhDElYaAdDmBlCqAf@mGjAoTn@kPi@m@tE",
    ),
}

_ROUTE_PROFILES = {
    "atlas_eindhoven": RoutePresetProfile(
        name="atlas_eindhoven",
        display_name="Atlas Eindhoven Validation Loop",
        base_speed_kph=32,
        hint="Full Eindhoven road route with dynamic speed, a short stop, an idle period, and engine-off telemetry.",
        phases=ATLAS_PROFILE_PHASES,
    ),
    "harbor_eindhoven": RoutePresetProfile(
        name="harbor_eindhoven",
        display_name="Harbor Eindhoven Validation Loop",
        base_speed_kph=26,
        hint="Lower-speed urban and industrial route without trip telemetry, forcing Fleets fallback segmentation through a break and a short stop.",
        phases=HARBOR_PROFILE_PHASES,
        emits_trip_attribute=False,
    ),
    "delta_eindhoven": RoutePresetProfile(
        name="delta_eindhoven",
        display_name="Delta Eindhoven Validation Loop",
        base_speed_kph=42,
        hint="Faster road route with a moving degraded-signal window and a short operational stop.",
        phases=DELTA_PROFILE_PHASES,
    ),
    "nimbus_eindhoven": RoutePresetProfile(
        name="nimbus_eindhoven",
        display_name="Nimbus Eindhoven Validation Loop",
        base_speed_kph=24,
        hint="Intermittent tracker route with an early offline gap and later engine-off telemetry.",
        phases=NIMBUS_PROFILE_PHASES,
    ),
    "courier_eindhoven": RoutePresetProfile(
        name="courier_eindhoven",
        display_name="Courier Eindhoven Validation Loop",
        base_speed_kph=34,
        hint="Delivery-style route without trip telemetry, including idle, driver break, and a late offline gap.",
        phases=COURIER_PROFILE_PHASES,
        emits_trip_attribute=False,
    ),
}


def _dedupe_consecutive(points: list[RoutePoint]) -> list[RoutePoint]:
    deduped: list[RoutePoint] = []
    for point in points:
        if not deduped or point != deduped[-1]:
            deduped.append(point)
    return deduped


@lru_cache(maxsize=None)
def _build_route(name: str) -> tuple[RoutePoint, ...]:
    geometries = _ROUTE_GEOMETRIES[name]
    points: list[RoutePoint] = []
    for geometry in geometries:
        segment_points = decode_polyline6(geometry)
        if points and segment_points and points[-1] == segment_points[0]:
            points.extend(segment_points[1:])
        else:
            points.extend(segment_points)
    return tuple(_dedupe_consecutive(points))


def route_preset_exists(name: str) -> bool:
    return name in _ROUTE_GEOMETRIES


def list_route_presets() -> dict[str, str]:
    return {name: profile.display_name for name, profile in _ROUTE_PROFILES.items()}


def list_route_preset_details() -> dict[str, dict[str, object]]:
    return {
        name: {
            "display_name": profile.display_name,
            "base_speed_kph": profile.base_speed_kph,
            "hint": profile.hint,
            "emits_trip_attribute": profile.emits_trip_attribute,
            "history_time_scale": profile.history_time_scale,
            "history_backfill_minutes": profile.history_backfill_minutes,
            "phases": [
                {
                    "kind": phase.kind,
                    "start_progress": phase.start_progress,
                    "duration_seconds": phase.duration_seconds,
                }
                for phase in profile.phases
            ],
        }
        for name, profile in _ROUTE_PROFILES.items()
    }


def get_route_preset_profile(name: str) -> RoutePresetProfile:
    if name not in _ROUTE_PROFILES:
        raise KeyError(f"unknown route preset: {name}")
    return _ROUTE_PROFILES[name]


def get_route_preset(name: str) -> list[RoutePoint]:
    if name not in _ROUTE_GEOMETRIES:
        raise KeyError(f"unknown route preset: {name}")
    return list(_build_route(name))
